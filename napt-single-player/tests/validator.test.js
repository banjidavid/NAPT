'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {validate, resultFor, analyzeWikidata} = require('../validator');
const classified = [
 {id:'Q1',description:'male given name',isName:true,isPlace:false,isAnimal:false,isThing:false},
 {id:'Q2',description:'species of mammal',isName:false,isPlace:false,isAnimal:true,isThing:false},
 {id:'Q3',description:'city in Nigeria',isName:false,isPlace:true,isAnimal:false,isThing:false},
 {id:'Q4',description:'container used to hold liquid',isName:false,isPlace:false,isAnimal:false,isThing:true}
];
test('validates starting letter before network',async()=>{let called=false;const answer=await validate({letter:'B',category:'Animal',answer:'Cat'},()=>{called=true;});assert.equal(answer.status,'invalid');assert.equal(called,false);});
test('rejects malformed inputs',async()=>{const result=await validate({letter:'B',category:'Other',answer:'Bear'});assert.equal(result.status,'invalid');});
test('supports category-specific matches',()=>{assert.equal(resultFor('Name','Benjamin',[classified[0]],[]).status,'valid');assert.equal(resultFor('Animal','Bear',[classified[1]],[]).status,'valid');assert.equal(resultFor('Place','Benin',[classified[2]],[]).status,'valid');assert.equal(resultFor('Thing','Bottle',[classified[3]],[]).status,'valid');});
test('does not approve words in the wrong category',()=>{assert.equal(resultFor('Name','Bottle',[classified[3]],[]).status,'review');assert.equal(resultFor('Animal','Bottle',[classified[3]],[]).status,'review');assert.equal(resultFor('Place','Bottle',[classified[3]],[]).status,'review');assert.equal(resultFor('Thing','Bear',[classified[1]],[]).status,'review');});
test('unknown entries require review',()=>{for(const c of ['Name','Animal','Place','Thing'])assert.equal(resultFor(c,'Balenko',[],[]).status,'review');});
test('different categories can classify same text differently',()=>{assert.equal(resultFor('Thing','Ball',[],['A spherical object used in games']).status,'valid');assert.equal(resultFor('Animal','Ball',[],['A spherical object used in games']).status,'review');});

// Regional names and multi-meaning words need careful, category-specific checks.
test('recognizes a documented Nigerian given name',()=>{
  const entries=analyzeWikidata([{id:'Q100',description:'Yoruba masculine given name',entity:{claims:{}}}]);
  assert.equal(resultFor('Name','Adeola',entries,[]).status,'valid');
});
test('recognizes a geographical locality in Nigeria',()=>{
  const entries=analyzeWikidata([{id:'Q101',description:'city in Kano State, Nigeria',entity:{claims:{}}}]);
  assert.equal(resultFor('Place','Kano',entries,[]).status,'valid');
});
test('does not mistake place names for animals',()=>{
  const entries=analyzeWikidata([{id:'Q102',description:'town in Bear Lake County',entity:{claims:{}}}]);
  assert.equal(entries[0].isPlace,true);
  assert.equal(entries[0].isAnimal,false);
});
test('does not mistake country music for a country',()=>{
  const entries=analyzeWikidata([{id:'Q103',description:'country music artist',entity:{claims:{}}}]);
  assert.equal(entries[0].isPlace,false);
});
test('dictionary animal sense and object sense are evaluated per category',()=>{
  assert.equal(resultFor('Animal','Bat',[],['A flying nocturnal mammal.','A wooden club.']).status,'valid');
  assert.equal(resultFor('Thing','Bat',[],['A flying nocturnal mammal.','A wooden club used in sports.']).status,'valid');
});
