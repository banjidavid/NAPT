'use strict';

// Public-source category checks. Uncertainty MUST return review, not a fabricated verdict.
const CATEGORIES = new Set(['Name', 'Animal', 'Place', 'Thing']);
const USER_AGENT = 'NAPT-SinglePlayer/2.2 (educational word game)';
const cache = new Map();
const TTL = 24 * 60 * 60 * 1000;
const cacheLimit = 1000;
const animalWords = /\b(animal|mammal|bird|fish|reptile|amphibian|insect|arachnid|crustacean|mollus[ck]|vertebrate|invertebrate|cat|dog|bear|lion|tiger|elephant|whale|dolphin|primate|rodent|horse|cow|sheep|goat|feline|canine|butterfly|beetle|antelope|lizard|snake|spider|eagle|hawk|shark|penguin|frog|species of (?:wild|domestic|marine))\b/i;
const botanicalWords = /\b(plant|tree|shrub|flower|fungus|fruit|vegetable|alga|grass|bacteri|virus|mushroom|botanical|crop)\b/i;
const placeWords = /\b(city|town|village|country|state|province|region|capital|municipality|settlement|island|continent|river|mountain|lake|district|county|territory|neighborhood|neighbourhood|borough|urban area|geographic|geographical|populated place|administrative division|local government area|national park|waterfall)\b/i;
const nameWords = /\b(given name|first name|personal name|surname|family name|forename|male name|female name|unisex name|masculine name|feminine name)\b/i;
const objectWords = /\b(object|device|tool|instrument|machine|vehicle|appliance|container|vessel|bottle|cup|furniture|clothing|garment|building material|equipment|utensil|weapon|toy|book|printed|paper|food|fruit|vegetable|dish|drink|item|article|fabric|material|substance|structure|electronic|computer|phone|shoe|bag|seat|chair|table|bed|lamp|car|aircraft|door|window|box|ball|club|bat|household|physical|portable|piece of|used for|used to|made of|made from|consisting of|consists of)\b/i;
const personWords = /\b(person|people|human|individual|man|woman|profession|occupation|celebrity|politician|actor|musician)\b/i;
function tidy(value) { return String(value || '').trim().replace(/\s+/g, ' '); }
function item(id, reason, source) { return {status: id, reason, ...(source ? {source} : {})}; }
function keyFor(category, value) { return `${category}|${value.toLocaleLowerCase('en')}`; }
function cachePut(key, value) {
  if (cache.size >= cacheLimit) cache.delete(cache.keys().next().value);
  cache.set(key, {until: Date.now() + TTL, value});
}
async function getJSON(url, fetcher = fetch) {
  const response = await fetcher(url, {headers: {'Accept': 'application/json', 'User-Agent': USER_AGENT}, signal: AbortSignal.timeout(5500)});
  if (!response.ok) { const error = Error(`Source returned ${response.status}`); error.status = response.status; throw error; }
  return response.json();
}
function claims(entity, property) {
  return (entity?.claims?.[property] || []).map(v => v?.mainsnak?.datavalue?.value?.id).filter(Boolean);
}
async function wikidata(value, fetcher) {
  const searchURL = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({action:'wbsearchentities', search:value, language:'en', format:'json', origin:'*', limit:'8'});
  const search = await getJSON(searchURL, fetcher);
  const results = (search.search || []).filter(v => {
    const label = tidy(v.label).toLocaleLowerCase('en');
    const match = tidy(v.match?.text).toLocaleLowerCase('en');
    const needle = value.toLocaleLowerCase('en');
    return label === needle || match === needle;
  }).slice(0, 6);
  if (!results.length) return [];
  const detailURL = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({action:'wbgetentities', ids:results.map(x=>x.id).join('|'), props:'claims|descriptions|labels', languages:'en', format:'json', origin:'*'});
  const details = await getJSON(detailURL, fetcher);
  return results.map(x => ({id:x.id, label:x.label, description:details.entities?.[x.id]?.descriptions?.en?.value || x.description || '', entity:details.entities?.[x.id] || {}}));
}
async function dictionary(value, fetcher) {
  try {
    const out = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(value)}`, fetcher);
    return Array.isArray(out) ? out : [];
  } catch (e) { if(e.status === 404) return []; throw e; }
}
function hasNoun(dictionaryEntries) {
  return dictionaryEntries.flatMap(x=>x.meanings || []).filter(x=>x.partOfSpeech === 'noun').flatMap(x=>x.definitions || []).map(x=>String(x.definition || ''));
}
// Descriptions are useful evidence but a word buried in a place or person's name
// is not category evidence. Examples: "Bear Lake" is not an animal, and
// "country music" is not a geographical place.
const animalDescription = /^(?:species|subspecies|breed|genus|family|order|class|group|type|common name) of (?:[\w -]*\b(?:animal|mammal|bird|fish|reptile|amphibian|insect|arachnid|crustacean|mollus[ck]|vertebrate|invertebrate|cat|dog|bear|lion|tiger|elephant|whale|dolphin|primate|rodent|horse|cow|sheep|goat|feline|canine|butterfly|beetle|antelope|lizard|snake|spider|eagle|hawk|shark|penguin|frog)\b)|^(?:domesticated|wild|marine|aquatic|extinct) (?:[\w -]*\b(?:animal|mammal|bird|fish|reptile|insect|species)\b)|^(?:animal|mammal|bird|fish|reptile|amphibian|insect|arachnid|crustacean|mollus[ck]|vertebrate|invertebrate)\b/i;
const placeDescription = /^(?:(?:[\w-]+ )?(?:city|town|village|country|state|province|region|capital|municipality|settlement|island|continent|river|mountain|lake|district|county|territory|neighbou?rhood|borough|urban area|populated place|administrative division|local government area|national park|waterfall)\b|(?:capital|city|town|village|island|river|mountain|lake|district|region|province|state|county|country) (?:of|in)\b|(?:[\w-]+ )?geographic(?:al)? (?:region|place|feature)\b)/i;
const nameDescription = /\b(?:given name|first name|personal name|surname|family name|forename|male name|female name|unisex name|masculine name|feminine name)\b/i;
const objectDescription = /^(?:(?:type|kind|form|piece) of )?(?:[\w-]+ )?(?:object|device|tool|instrument|machine|vehicle|appliance|container|vessel|furniture|clothing|garment|equipment|utensil|toy|book|food|drink|fruit|vegetable|fabric|material|substance|electronic|computer|phone|shoe|bag|chair|table|bed|lamp|car|aircraft|door|window|box|ball|bottle|cup)\b/i;
function analyzeWikidata(items) {
  return items.map(x => {
    const types = claims(x.entity,'P31');
    const description = String(x.description || '').trim();
    const isPerson = types.includes('Q5') || /^(?:[\w -]+ )?(?:person|politician|actor|musician|artist|footballer|writer|athlete)\b/i.test(description);
    const isName = nameDescription.test(description) || types.some(id=>['Q202444','Q12308941','Q11879590','Q101352'].includes(id));
    const isPlace = (placeDescription.test(description) && !/^country (?:music|singer|artist|song|album|genre)\b/i.test(description)) || (claims(x.entity,'P625').length > 0 && !isPerson && !isName);
    // Wikidata Q25894 is the established common-name concept 'antelope',
    // not a taxonomic species. Its description does not match species-of-animal rules.
    const isDocumentedAnimalConcept = x.id === 'Q25894' && x.label.toLocaleLowerCase('en') === 'antelope';
    const isAnimal = (isDocumentedAnimalConcept || animalDescription.test(description)) && !botanicalWords.test(description) && !isPlace && !isPerson;
    const isBotanical = /^(?:species|subspecies|genus|family|order|type) of (?:[\w -]*\b(?:plant|tree|flower|fungus|fruit|vegetable|alga|grass)\b)|^(?:plant|tree|flower|fungus|fruit|vegetable|alga|grass)\b/i.test(description);
    const isThing = objectDescription.test(description) && !isPlace && !isPerson && !isAnimal;
    return {...x, isName, isPerson, isPlace, isAnimal, isBotanical, isThing,
      isTaxon:types.includes('Q16521') || claims(x.entity,'P105').length > 0};
  });
}
function sourceFor(x) { return `https://www.wikidata.org/wiki/${x.id}`; }
function resultFor(category, value, found, definitions, dictSource) {
  const has = field => found.find(v => v[field]);
  const def = definitions.join(' | ');
  if (category === 'Name') {
    const match = has('isName');
    if (match) return item('valid', `${value} is documented as a personal name.`, sourceFor(match));
    // A human with this name does not prove it is commonly a given name;
    // users can enter surnames or culturally specific names, so don't reject unknowns.
    return item('review', 'This name could not be confidently confirmed by the online name source.');
  }
  if (category === 'Animal') {
    const match = has('isAnimal');
    if (match) return item('valid', `${value} is identified as an animal.`, sourceFor(match));
    if (definitions.some(d => animalWords.test(d) && !botanicalWords.test(d) && !placeWords.test(d))) return item('valid', `${value} is described as an animal in the dictionary.`, dictSource);
    const other = found.find(x => x.isBotanical || x.isPlace || x.isName || x.isThing);
    if (other && !has('isTaxon') && !definitions.length) return item('review', `${value} was found in another category, but an animal meaning has not been ruled out.`, sourceFor(other));
    return item('review', 'Not enough reliable animal-category evidence was found.');
  }
  if (category === 'Place') {
    const match = has('isPlace');
    if (match) return item('valid', `${value} is documented as a geographical place.`, sourceFor(match));
    const other = found.find(x=>x.isName || x.isAnimal || x.isThing || x.isBotanical);
    if (other && !found.some(x=>x.isPlace)) return item('review', `${value} has another documented meaning; a place with this name could still exist.`, sourceFor(other));
    return item('review', 'This place was not clearly identified in the geographical database.');
  }
  if (category === 'Thing') {
    const match = has('isThing');
    if (match) return item('valid', `${value} is documented as a physical thing.`, sourceFor(match));
    if (definitions.some(x => objectWords.test(x) && !animalWords.test(x) && !personWords.test(x) && !placeWords.test(x)))
      return item('valid', `A physical-object meaning of ${value} appears in the dictionary.`, dictSource);
    if (has('isAnimal') && !definitions.some(x=>objectWords.test(x))) return item('review', `Only an animal meaning of ${value} was found. An object meaning remains unverified.`,sourceFor(has('isAnimal')));
    if (has('isPlace') && !definitions.some(x=>objectWords.test(x))) return item('review', `Only a place meaning of ${value} was found. An object meaning remains unverified.`,sourceFor(has('isPlace')));
    if (has('isName') && !definitions.some(x=>objectWords.test(x))) return item('review', `Only a name meaning of ${value} was found. An object meaning remains unverified.`,sourceFor(has('isName')));
    return item('review', 'A physical-object meaning could not be confidently verified.');
  }
  return item('review','Unable to classify this answer.');
}
async function validate(input, fetcher = fetch) {
  const letter = tidy(input?.letter).toLocaleUpperCase('en');
  const category = tidy(input?.category);
  const answer = tidy(input?.answer);
  if (!/^[A-Z]$/.test(letter) || !CATEGORIES.has(category) || !answer || answer.length > 80 || /[\x00-\x1f<>]/.test(answer)) {
    return item('invalid', 'Enter a valid letter (A–Z), category, and answer (up to 80 characters).');
  }
  if (answer[0].toLocaleUpperCase('en') !== letter) return item('invalid', `Answer must begin with ${letter}.`);
  const cacheKey = keyFor(category,answer), hit = cache.get(cacheKey);
  if(hit && hit.until > Date.now()) return hit.value;
  const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(answer)}`;
  try {
    const [wd,dict] = await Promise.allSettled([wikidata(answer,fetcher),category==='Name' ? Promise.resolve([]) : dictionary(answer,fetcher)]);
    if(wd.status === 'rejected' && dict.status === 'rejected') return item('review','Online verification sources are unavailable. Please retry.');
    const found = analyzeWikidata(wd.status === 'fulfilled'?wd.value:[]);
    const definitions = dict.status === 'fulfilled' ? hasNoun(dict.value) : [];
    const result = resultFor(category,answer,found,definitions,dictUrl);
    // Do not reject when Wikimedia was unavailable; conflicting categories need evidence.
    if(wd.status === 'rejected' && result.status === 'invalid') return item('review','A category source was unavailable; answer needs review.');
    if(result.status !== 'review' || (wd.status === 'fulfilled' && dict.status === 'fulfilled')) cachePut(cacheKey,result);
    return result;
  } catch {
    return item('review','Verification could not complete. Retry later.');
  }
}
module.exports = { validate, analyzeWikidata, resultFor, tidy };
