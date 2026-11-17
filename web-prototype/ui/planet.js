// Presentation only: damage, rewards and saves remain owned by the game systems.
export function createPlanetGrid(wave = 1) {
  const cells = [];
  for (let x = -14; x <= 14; x++) for (let y = -14; y <= 14; y++) {
    if (x*x + y*y <= 196) cells.push({x,y,tone:((x+17)*31+(y+17)*13+wave*7)%11});
  }
  // Excavate from the near side inward, leaving a connected core.
  cells.sort((a,b) => b.x-a.x || Math.abs(b.y)-Math.abs(a.y) || a.y-b.y);
  const indices = new Map(cells.map((cell,index) => [`${cell.x},${cell.y}`,index]));
  for (const cell of cells) cell.neighbors = [[0,-1],[1,0],[0,1],[-1,0]].map(([x,y]) => indices.get(`${cell.x+x},${cell.y+y}`));
  return {cells,diameter:29};
}

export function removedPlanetCells(grid,hp,maxHp) {
  const fraction = maxHp > 0 ? Math.min(1,Math.max(0,hp/maxHp)) : 1;
  return Math.min(grid.cells.length,Math.floor((1-fraction)*grid.cells.length));
}

export function createPlanetRenderer() {
  let grid, key, previousRemoved = 0, clock = 0, particles = [];
  return {
    resetParticles() { particles = []; },
    draw(ctx,{state,x,y,radius,color,isBoss,dtMs,reduced}) {
      const delta = Math.max(0,Math.min(50,dtMs || 0));
      clock += delta;
      const currentKey = `${state.prestige.runs}:${state.combat.wave}`;
      if (key !== currentKey) {
        key = currentKey;
        grid = createPlanetGrid(state.combat.wave);
        previousRemoved = removedPlanetCells(grid,state.combat.asteroidHp,state.combat.maxAsteroidHp);
        particles = [];
      }
      const removed = removedPlanetCells(grid,state.combat.asteroidHp,state.combat.maxAsteroidHp);
      const size = radius*2/grid.diameter;
      const cell = grid.cells[Math.min(removed,grid.cells.length-1)];
      const target = {x:x+(cell.x+0.5)*size,y:y+cell.y*size,active:state.combat.asteroidHp>0};
      if (!reduced && removed>previousRemoved && removed-previousRemoved<grid.cells.length/2) {
        for (let i=previousRemoved;i<Math.min(removed,previousRemoved+8);i++) {
          for (let shard=0;shard<3;shard++) {
            const seed = i*7+shard*19, c = grid.cells[i];
            particles.push({x:x+c.x*size,y:y+c.y*size,vx:25+seed%65,vy:seed%91-45,age:0,life:400+seed%300,size:Math.max(1.5,size*0.4)});
          }
        }
        particles = particles.slice(-72);
      }
      previousRemoved = removed;
      if (reduced) particles = [];
      ctx.strokeStyle = `${color}25`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2,5]);
      ctx.beginPath(); ctx.arc(x,y,radius+3,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      const fills = isBoss ? ['#482b20','#693c25','#874d29'] : ['#123040','#183e50','#205366'];
      for (let i=removed;i<grid.cells.length;i++) {
        const c = grid.cells[i], left=x+(c.x-0.5)*size, top=y+(c.y-0.5)*size;
        ctx.fillStyle = fills[c.tone%fills.length];
        ctx.fillRect(left,top,size+0.3,size+0.3);
        if (c.tone===0) {
          ctx.fillStyle = `${color}70`;
          ctx.fillRect(left+size*0.3,top+size*0.3,size*0.4,size*0.4);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i=removed;i<grid.cells.length;i++) {
        const c=grid.cells[i], left=x+(c.x-0.5)*size, top=y+(c.y-0.5)*size;
        const edges=[[left,top,left+size,top],[left+size,top,left+size,top+size],[left+size,top+size,left,top+size],[left,top+size,left,top]];
        for (let e=0;e<4;e++) if (c.neighbors[e]===undefined || c.neighbors[e]<removed) {
          ctx.moveTo(edges[e][0],edges[e][1]); ctx.lineTo(edges[e][2],edges[e][3]);
        }
      }
      ctx.stroke();
      if (target.active) {
        ctx.fillStyle='#ecfeff'; ctx.fillRect(target.x-2,target.y-2,4,4);
        if (!reduced) {
          ctx.strokeStyle=`${color}88`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(target.x,target.y,4+(clock%260)/40,0,Math.PI*2); ctx.stroke();
        }
      }
      for (const p of particles) {
        p.age+=delta; p.x+=p.vx*delta/1000; p.y+=p.vy*delta/1000; p.vy+=30*delta/1000;
        ctx.globalAlpha=Math.max(0,1-p.age/p.life); ctx.fillStyle=color;
        ctx.fillRect(p.x,p.y,p.size,p.size);
      }
      particles=particles.filter(p=>p.age<p.life);
      ctx.globalAlpha=1;
      return target;
    }
  };
}
