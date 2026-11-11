import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import crypto from 'node:crypto';

const app = express();
app.use(express.static('public'));
app.get('/health', (_,res)=>res.json({ok:true}));
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:false}});
const rooms=new Map();
const MAX_PLAYERS=8;
const CATEGORIES={
  'Animales':['perro','gato','elefante','jirafa','león','tigre','oso','lobo','zorro','conejo','caballo','vaca','cerdo','oveja','gallina','pato','águila','paloma','pingüino','delfín','ballena','tiburón','pulpo','cangrejo','mariposa','abeja','hormiga','araña','serpiente','cocodrilo','tortuga','rana','sapo','mono','gorila','cebra','hipopótamo','rinoceronte','camello','llama','koala','panda','murciélago','ratón','ardilla','ciervo','venado','búho','loro','flamenco'],
  'Frutas':['manzana','pera','banano','plátano','naranja','mandarina','limón','lima','mango','papaya','piña','sandía','melón','uva','fresa','frambuesa','mora','arándano','cereza','durazno','melocotón','ciruela','kiwi','coco','granadilla','maracuyá','guanábana','guayaba','lulo','uchuva','higo','dátil','pomelo','toronja','aguacate'],
  'Países':['colombia','argentina','brasil','chile','perú','ecuador','venezuela','bolivia','paraguay','uruguay','méxico','canadá','estados unidos','españa','francia','alemania','italia','portugal','reino unido','irlanda','noruega','suecia','finlandia','dinamarca','islandia','japón','china','india','corea del sur','australia','nueva zelanda','egipto','marruecos','sudáfrica','kenia','nigeria','turquía','grecia','suiza','austria','bélgica','países bajos','polonia','ucrania','rusia','cuba','costa rica','panamá','guatemala','honduras'],
  'Comidas':['pizza','hamburguesa','arepa','empanada','tamal','arroz','pasta','espagueti','lasaña','sopa','ensalada','sándwich','perro caliente','taco','burrito','quesadilla','sushi','ramen','ceviche','ajiaco','sancocho','bandeja paisa','lechona','patacón','frijoles','lentejas','garbanzos','pollo','carne','pescado','huevo','pan','queso','yogur','helado','torta','galleta','chocolate','churro','flan','natilla','buñuelo','croqueta','paella'],
  'Colores':['rojo','azul','amarillo','verde','naranja','morado','violeta','rosa','rosado','negro','blanco','gris','café','marrón','beige','turquesa','dorado','plateado','lila','fucsia','magenta','celeste','índigo','ocre','coral','granate'],
  'Profesiones':['médico','doctor','enfermero','abogado','juez','fiscal','profesor','maestro','ingeniero','arquitecto','policía','bombero','piloto','cocinero','chef','panadero','carpintero','electricista','plomero','mecánico','periodista','escritor','actor','cantante','músico','pintor','fotógrafo','dentista','veterinario','psicólogo','científico','astronauta','agricultor','jardinero','conductor','taxista','contador','programador','diseñador','farmacéutico','bibliotecario'],
  'Objetos de casa':['mesa','silla','cama','sofá','almohada','cobija','sábana','espejo','lámpara','reloj','televisor','nevera','refrigerador','estufa','horno','microondas','licuadora','lavadora','secadora','plato','vaso','taza','cuchara','tenedor','cuchillo','olla','sartén','escoba','trapero','jabón','toalla','cepillo','peine','ventilador','computador','libro','cuaderno','lápiz','bolígrafo','puerta','ventana','cortina','alfombra','armario','closet']
};
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-zñ\s]/g,'').replace(/\s+/g,' ').trim();
const accepted=Object.fromEntries(Object.entries(CATEGORIES).map(([k,v])=>[k,new Set(v.map(normalize))]));
const cleanName=s=>String(s||'').trim().replace(/[<>]/g,'').slice(0,18);
const code=()=>crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
const roomFor=s=>rooms.get(s.data.room);
function send(room){io.to(room.code).emit('state',{code:room.code,host:room.host,phase:room.phase,players:room.players.map(p=>({id:p.id,name:p.name,lives:p.lives,connected:p.connected})),turn:room.turn,category:room.category,deadline:room.deadline,used:room.used,round:room.round,winner:room.winner,message:room.message});}
function clear(room){if(room.timer)clearTimeout(room.timer);room.timer=null;}
function next(room){clear(room);if(room.phase!=='playing')return;const alive=room.players.filter(p=>p.connected&&p.lives>0);if(alive.length<=1){room.phase='finished';room.winner=alive[0]?.id||null;room.deadline=0;room.message=alive[0]?`${alive[0].name} ganó la partida 🎉`:'La partida terminó';send(room);return;}
 let index=room.players.findIndex(p=>p.id===room.turn);for(let i=0;i<room.players.length;i++){index=(index+1)%room.players.length;if(room.players[index].connected&&room.players[index].lives>0)break;}
 room.turn=room.players[index].id;room.category=Object.keys(CATEGORIES)[Math.floor(Math.random()*Object.keys(CATEGORIES).length)];room.used=[];room.round++;room.deadline=Date.now()+ (7000+Math.floor(Math.random()*5000));room.message=`Turno de ${room.players[index].name}`;room.timer=setTimeout(()=>explode(room),room.deadline-Date.now());send(room);
}
function explode(room){if(room.phase!=='playing')return;const p=room.players.find(x=>x.id===room.turn);if(p)p.lives=Math.max(0,p.lives-1);room.message=`💥 ¡La bomba explotó! ${p?.name||'Jugador'} perdió un corazón.`;room.deadline=0;send(room);room.timer=setTimeout(()=>next(room),1800);}
function removePlayer(socket){const room=roomFor(socket);if(!room)return;const p=room.players.find(p=>p.id===socket.id);if(!p)return;room.players=room.players.filter(x=>x.id!==socket.id);socket.leave(room.code);socket.data.room=null;if(room.players.length===0){clear(room);rooms.delete(room.code);return;}if(room.host===socket.id)room.host=room.players[0].id;if(room.phase==='playing'&&room.turn===socket.id){clear(room);next(room);}else if(room.phase==='playing'&&room.players.filter(p=>p.lives>0).length<=1){clear(room);next(room);}else send(room);}
function reply(ack,obj){if(typeof ack==='function')ack(obj);}
io.on('connection',socket=>{
 socket.on('create',({name}={},ack)=>{const n=cleanName(name);if(!n)return reply(ack,{ok:false,error:'Escribe tu nombre.'});removePlayer(socket);let c;do{c=code()}while(rooms.has(c));const room={code:c,host:socket.id,players:[{id:socket.id,name:n,lives:3,connected:true}],phase:'lobby',turn:null,category:null,deadline:0,used:[],round:0,winner:null,message:'¡Comparte el código con tus amigos!',timer:null};rooms.set(c,room);socket.join(c);socket.data.room=c;reply(ack,{ok:true,code:c,id:socket.id});send(room);});
 socket.on('join',({name,code:input}={},ack)=>{const n=cleanName(name);const c=String(input||'').trim().toUpperCase();const room=rooms.get(c);if(!n)return reply(ack,{ok:false,error:'Escribe tu nombre.'});if(!room)return reply(ack,{ok:false,error:'No existe una sala con ese código.'});if(room.phase!=='lobby')return reply(ack,{ok:false,error:'La partida ya comenzó.'});if(room.players.length>=MAX_PLAYERS)return reply(ack,{ok:false,error:'La sala está llena.'});removePlayer(socket);room.players.push({id:socket.id,name:n,lives:3,connected:true});socket.join(c);socket.data.room=c;reply(ack,{ok:true,code:c,id:socket.id});send(room);});
 socket.on('start',(_,ack)=>{const r=roomFor(socket);if(!r||r.host!==socket.id)return reply(ack,{ok:false,error:'Solo el anfitrión puede iniciar.'});if(r.players.length<2)return reply(ack,{ok:false,error:'Se necesitan al menos dos jugadores.'});clear(r);r.phase='playing';r.players.forEach(p=>p.lives=3);r.turn=null;r.round=0;r.winner=null;reply(ack,{ok:true});next(r);});
 socket.on('answer',({answer}={},ack)=>{const r=roomFor(socket);if(!r||r.phase!=='playing'||r.turn!==socket.id)return reply(ack,{ok:false,error:'No es tu turno.'});if(Date.now()>=r.deadline){explode(r);return reply(ack,{ok:false,error:'¡Se acabó el tiempo!'});}const word=normalize(answer);if(!word||word.length>50)return reply(ack,{ok:false,error:'Escribe una respuesta válida.'});if(!accepted[r.category].has(word))return reply(ack,{ok:false,error:'No está en el diccionario de esta categoría. Prueba otra.'});if(r.used.includes(word))return reply(ack,{ok:false,error:'Esa respuesta ya se utilizó.'});r.used.push(word);r.message=`✅ ${r.players.find(p=>p.id===socket.id).name} respondió: ${String(answer).slice(0,50)}`;reply(ack,{ok:true});next(r);});
 socket.on('restart',(_,ack)=>{const r=roomFor(socket);if(!r||r.host!==socket.id||r.phase!=='finished')return reply(ack,{ok:false});clear(r);r.phase='lobby';r.turn=null;r.deadline=0;r.message='¡Listos para otra partida!';r.players.forEach(p=>p.lives=3);reply(ack,{ok:true});send(r);});
 socket.on('leave',()=>removePlayer(socket));socket.on('disconnect',()=>removePlayer(socket));
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Fiesta del Globo listo'));
