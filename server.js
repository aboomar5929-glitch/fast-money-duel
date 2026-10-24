import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import crypto from 'crypto';
const app=express(),server=http.createServer(app),io=new Server(server,{cors:{origin:'*'}});
app.use(express.static('public'));
const questions=[
{q:'Name something people do immediately after waking up.',a:[['Check phone',35],['Brush teeth',25],['Use bathroom',20],['Drink water',12],['Stretch',8]]},
{q:'Name something you might forget when leaving home.',a:[['Keys',38],['Phone',30],['Wallet',18],['Sunglasses',8],['Bag',6]]},
{q:'Name a popular pizza topping.',a:[['Pepperoni',36],['Cheese',25],['Mushrooms',17],['Olives',12],['Chicken',10]]},
{q:'Name something people do at the beach.',a:[['Swim',38],['Sunbathe',24],['Play volleyball',16],['Build sandcastle',12],['Eat',10]]},
{q:'Name something you find in a hotel room.',a:[['Bed',40],['TV',25],['Towels',17],['Mini fridge',10],['Safe',8]]},
{q:'Name something people buy at the cinema.',a:[['Popcorn',46],['Soda',28],['Nachos',13],['Candy',9],['Water',4]]},
{q:'Name an animal people keep as a pet.',a:[['Dog',40],['Cat',36],['Fish',12],['Bird',8],['Rabbit',4]]},
{q:'Name something you do when you are bored.',a:[['Watch TV',32],['Use phone',30],['Sleep',16],['Play games',14],['Read',8]]},
{q:'Name a reason someone is late for work.',a:[['Traffic',45],['Overslept',30],['Car trouble',12],['Weather',8],['Family',5]]},
{q:'Name something people take on vacation.',a:[['Clothes',35],['Passport',28],['Phone',20],['Sunscreen',10],['Camera',7]]}
];
const rooms=new Map();
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
function publicState(r){return {code:r.code,players:r.players.map(p=>({name:p.name,score:p.score,connected:p.connected})),status:r.status,round:r.round,total:5,question:r.status==='playing'?questions[r.indices[r.round]].q:null,answers:r.status==='reveal'?r.lastAnswers:null,deadline:r.deadline,submitted:r.submissions.map(Boolean),winner:r.status==='finished'?r.players.reduce((a,b)=>a.score>b.score?a:b).name:null};}
function emit(r){io.to(r.code).emit('state',publicState(r));}
function advance(r){clearTimeout(r.timer);const q=questions[r.indices[r.round]];r.lastAnswers=r.submissions.map((s,i)=>{const ans=normalize(s?.answer);const match=q.a.find(([v])=>normalize(v)===ans)||q.a.find(([v])=>ans.length>2&&(normalize(v).includes(ans)||ans.includes(normalize(v))));const points=match?match[1]:0;r.players[i].score+=points;return {name:r.players[i].name,answer:s?.answer||'No answer',matched:match?.[0]||null,points};});r.status='reveal';r.deadline=null;emit(r);r.timer=setTimeout(()=>{if(r.round===4){r.status='finished';emit(r);}else{r.round++;r.status='playing';r.submissions=[null,null];r.lastAnswers=null;r.deadline=Date.now()+25000;emit(r);r.timer=setTimeout(()=>advance(r),25000);}},6000);}
function start(r){r.status='playing';r.round=0;r.indices=Array.from({length:questions.length},(_,i)=>i).sort(()=>Math.random()-.5).slice(0,5);r.submissions=[null,null];r.deadline=Date.now()+25000;emit(r);r.timer=setTimeout(()=>advance(r),25000);}
io.on('connection',socket=>{
 socket.on('create',({name},cb)=>{name=String(name||'').trim().slice(0,22);if(!name)return cb({error:'Enter your name'});let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));const token=crypto.randomUUID();const r={code,players:[{name,score:0,token,connected:true}],status:'waiting',round:0,submissions:[null,null],timer:null};rooms.set(code,r);socket.join(code);socket.data={code,token};cb({code,token});emit(r);});
 socket.on('join',({code,name,token},cb)=>{code=String(code||'').trim().toUpperCase();name=String(name||'').trim().slice(0,22);const r=rooms.get(code);if(!r)return cb({error:'Room not found'});let p=token&&r.players.find(x=>x.token===token);if(!p){if(r.players.length>=2)return cb({error:'Room is full'});if(!name)return cb({error:'Enter your name'});p={name,score:0,token:crypto.randomUUID(),connected:true};r.players.push(p);}p.connected=true;socket.join(code);socket.data={code,token:p.token};cb({code,token:p.token});if(r.players.length===2&&r.status==='waiting')start(r);else emit(r);});
 socket.on('answer',({answer},cb=()=>{})=>{const r=rooms.get(socket.data.code);if(!r||r.status!=='playing'||Date.now()>r.deadline)return cb({error:'Round closed'});const i=r.players.findIndex(p=>p.token===socket.data.token);if(i<0||r.submissions[i])return cb({error:'Already submitted'});r.submissions[i]={answer:String(answer||'').slice(0,80)};cb({ok:true});emit(r);if(r.submissions.every(Boolean))advance(r);});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.code);if(!r)return;const p=r.players.find(p=>p.token===socket.data.token);if(p){p.connected=false;emit(r);}});
});
setInterval(()=>{for(const [code,r] of rooms)if(r.status==='finished'&&!r.players.some(p=>p.connected)){clearTimeout(r.timer);rooms.delete(code);}},600000).unref();
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Fast Money Duel ready'));
