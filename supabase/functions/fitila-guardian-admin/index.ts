import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,x-supabase-api-version", "Access-Control-Allow-Methods":"POST,OPTIONS" };
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers});
const targets = [
 {id:"web",url:"https://fitila.bj/",acceptable:[200]},
 {id:"supabase_gateway",url:"https://dvswhjawiooprghzeyol.supabase.co/",acceptable:[200,401,404]},
 {id:"auth_gateway",url:"https://dvswhjawiooprghzeyol.supabase.co/auth/v1/health",acceptable:[200]},
 {id:"dunya_voice",url:"https://dvswhjawiooprghzeyol.supabase.co/functions/v1/dunya-voice-turn",acceptable:[]},
 {id:"bariba_tts",url:"https://dvswhjawiooprghzeyol.supabase.co/functions/v1/bariba-tts",acceptable:[]},
 {id:"bariba_stt",url:"https://dvswhjawiooprghzeyol.supabase.co/functions/v1/bariba-stt",acceptable:[]},
];
Deno.serve(async req => {
 if(req.method==="OPTIONS")return new Response(null,{headers});
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return respond({error:"Authentication required"},401);
 const client=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user)return respond({error:"Authentication required"},401);
 const admin=createClient(url,service);
 const {data:role,error:roleError}=await admin.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
 if(roleError||!role)return respond({error:"Administrator only"},403);
 let body:{action?:string;service?:string}={};
 try{body=await req.json()}catch{return respond({error:"Invalid request"},400)}
 const action=body.action||"status";
 if(action==="status"){
  const {data,error}=await admin.from("fitila_guardian_checks").select("service,status,checked_at,latency_ms,http_status,detail").order("checked_at",{ascending:false}).limit(120);
  const {data:actions}=await admin.from("fitila_guardian_actions").select("action,service,created_at,detail").order("created_at",{ascending:false}).limit(30);
  const {data:incidents, error:incidentsError}=await admin.from("fitila_guardian_incidents").select("service,state,consecutive_failures,consecutive_successes,opened_at,recovered_at,updated_at,detail").order("updated_at",{ascending:false});
  return error||incidentsError?respond({error:"Cannot read Guardian monitoring records"},500):respond({checks:data||[],actions:actions||[],incidents:incidents||[]});
 }
 if(action==="probe"){
  const requested=body.service;
  if(requested&& !targets.some(t=>t.id===requested))return respond({error:"Unknown service"},400);
  const chosen=requested?targets.filter(t=>t.id===requested):targets;
  const results=await Promise.all(chosen.map(async target=>{
   const start=Date.now();let code:null|number=null;let status="unknown";let detail="No definitive health signal";
   try{
    const voice = ["dunya_voice","bariba_tts","bariba_stt"].includes(target.id);
    // A GET without the expected JSON/audio body is not a health check: it
    // creates false HTTP 400/500 incidents for healthy inference endpoints.
    const response=await fetch(target.url,{
      method:voice?"OPTIONS":"GET",
      headers:target.id==="auth_gateway"?{"apikey":anon}:undefined,
      signal:AbortSignal.timeout(6500),
      redirect:"manual",
    });
    code=response.status;
    if(target.id==="web"){
      status=response.ok?"healthy":"unavailable";
      detail="Public website GET: reachability only";
    }else if(target.id==="auth_gateway"){
      if(code===200){
        try {
          const health=await response.json();
          status=health && typeof health==="object"?"healthy":"degraded";
        }catch{status="degraded"}
      }else{
        status=code===401||code===403?"degraded":"unavailable";
      }
      detail=code===200?"Auth health endpoint with apikey":"Auth probe: review credentials and gateway access";
    }else if(target.id==="supabase_gateway"){
      status=target.acceptable.includes(code)?"degraded":"unavailable";
      detail="HTTP reachability, not proof of database availability";
    }else{
      status=code>=200&&code<400?"degraded":code===401||code===403||code===405?"degraded":"unknown";
      detail="OPTIONS reachability only; no ASR/TTS inference performed";
    }
   }catch(e){status="unavailable";detail=e instanceof Error?e.name:"Network error"}
   const row={service:target.id,status,http_status:code,latency_ms:Date.now()-start,detail};
   await admin.from("fitila_guardian_checks").insert(row);
   return row;
  }));
  await admin.from("fitila_guardian_actions").insert({actor:user.id,action:"probe",service:requested||"all",detail:"Manual safe read-only probes"});
  return respond({results});
 }
 if(action==="acknowledge"){
  if(!targets.some(t=>t.id===body.service))return respond({error:"Unknown service"},400);
  const {error}=await admin.from("fitila_guardian_actions").insert({actor:user.id,action:"acknowledge",service:body.service,detail:"Administrator acknowledged investigation; no repair performed"});
  return error?respond({error:"Audit write failed"},500):respond({ok:true});
 }
 return respond({error:"Unsupported action"},400);
});