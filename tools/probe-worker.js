const HOST='https://khidmaty-agent.semohabiby7.workers.dev'

export default{
  async fetch(request,env){
    const out={binding:env.BRAIN?'yes':'no',via_binding:{},via_public:{}}
    for(const p of ['/','/requests','/report','/stats']){
      try{const r=await env.BRAIN.fetch(HOST+p);out.via_binding[p]=r.status}
      catch(e){out.via_binding[p]='ERR:'+(e&&e.name)}
    }
    for(const p of ['/requests']){
      try{const r=await fetch(HOST+p);out.via_public[p]=r.status}
      catch(e){out.via_public[p]='ERR:'+(e&&e.name)}
    }
    return new Response(JSON.stringify(out,null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}})
  }
}
