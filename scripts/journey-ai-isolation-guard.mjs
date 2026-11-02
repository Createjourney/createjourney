/**
 * Fail-closed, read-only preflight for the authenticated Journey AI E2E harness.
 * Never trust a caller's "isolated" flag as evidence that a business is disposable.
 * The production schema constrains data_environment to "production" or "test".
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function assertIsolatedTestBusiness({url,anon,token,business,fetchImpl=fetch}){
  if(!uuid.test(business))throw Error("Isolation preflight: invalid business UUID");
  const headers={authorization:"Bearer "+token,apikey:anon,accept:"application/json"};
  async function read(path){
    const response=await fetchImpl(url+path,{method:"GET",headers,signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error("Isolation preflight: authenticated read failed (HTTP "+response.status+")");
    const data=await response.json();
    if(!data||typeof data!=="object")throw Error("Isolation preflight: invalid read response");
    return data;
  }
  const user=await read("/auth/v1/user");
  if(!uuid.test(String(user?.id||"")))throw Error("Isolation preflight: authenticated user not confirmed");
  const id=encodeURIComponent(business),userId=encodeURIComponent(user.id);
  const rows=await read("/rest/v1/businesses?select=id,data_environment&id=eq."+id);
  if(!Array.isArray(rows)||rows.length!==1||rows[0]?.id!==business||rows[0]?.data_environment!=="test")
    throw Error("Isolation preflight: business is not explicitly marked data_environment=test");
  const members=await read("/rest/v1/business_members?select=role,is_active&business_id=eq."+id+"&user_id=eq."+userId);
  if(!Array.isArray(members)||members.length!==1||members[0]?.is_active!==true||
     !["owner","manager"].includes(String(members[0]?.role||"").toLowerCase()))
    throw Error("Isolation preflight: authenticated owner/manager membership required");
  for(const table of ["boards","journeys"]){
    const records=await read("/rest/v1/"+table+"?select=id&business_id=eq."+id+"&limit=1");
    if(!Array.isArray(records)||records.length!==0)
      throw Error("Isolation preflight: test business contains "+table+"; refusing synthetic jobs");
  }
  return {business_id:business,data_environment:"test",user_id:user.id,empty_boards_and_journeys:true};
}
