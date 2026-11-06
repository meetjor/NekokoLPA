const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert/strict');
const root = process.argv[2] || process.cwd();
const ts = require(path.join(root, 'node_modules/typescript'));
function harness(realRuntime = false) {
  const registry = {Adapters: {}, ConnectedBluetoothDevices: []};
  let slots = [];
  const cache = new Map();
  const stubExecutor = async () => [];
  const native = {OMAPIBridge: {listDevices: async () => JSON.stringify(slots)}, CCIDPlugin: {listReaders: async () => []}, CustomHttp: {sendHttpRequest: async () => '{}'}};
  class FakeDispatcher {
    constructor(opts) {this.opts = opts;}
    setChannel() {}
    execute() {return this.opts.transmit('80CA000000');}
  }
  const mocks = {
    '@/lpa/adapters/registry': registry,
    '@/lpa/bridge/nativeModules': native,
    '@/store/slices': {setDeviceState: payload => ({type:'state',payload}),setInternalDevices:payload=>({type:'devices',payload}),setTargetDevice:payload=>({type:'target',payload})},
    'react-native': {Platform:{OS:'android'}},
    '@/shared/utils/aid': {getAIDList:()=>''},
    '@/lpa/core': {LpaDispatcher:FakeDispatcher,CLA_PROPRIETARY:128,channelClaHex:()=> '81'},
  };
  if (!realRuntime) mocks['@/lpa/bridge/runtime'] = {setupDevice: async a => a._execute};
  for (const [f,c] of [['CcidDevice','CcidDevice'],['EstkMeRedDevice','EstkMeRed'],['EstkMeRed2Device','EstkMeRed2'],['BeeSimDevice','BeeSimDevice'],['SimLinkDevice','SimLinkDevice']]) mocks['@/lpa/adapters/'+f] = {[c]:class {}};
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const m={exports:{}};cache.set(file,m);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const req = id => {
      if (mocks[id]) return mocks[id];
      if (file.endsWith('/core/dispatcher.ts') && id === './lpa') return {Lpa:class {}};
      if (id.startsWith('@/') || id.startsWith('.')) {
        let p=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(file),id);
        if(fs.existsSync(p+'.ts'))p+='.ts';else if(fs.existsSync(path.join(p,'index.ts')))p=path.join(p,'index.ts');
        return load(p);
      }
      return require(require.resolve(id,{paths:[root]}));
    };
    vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;
  }
  return {registry,load,slots:v=>slots=v,device:(id='test')=>({deviceId:id,deviceName:id,displayName:id,type:'omapi',available:true,channel:'1',connect:async()=>true,disconnect:async()=>true,refresh:async()=>true,transmit:async()=> '9000'})};
}
(async()=> {
  let results=[];
  {
    const h=harness(), {Adapter}=h.load(root+'/src/lpa/adapters/Adapter.ts');
    const a=new Adapter(h.device(),()=>{});a.connected=true;
    assert.equal(await a.connect(),false);assert.equal(a.connected,false);
    results.push('CONFIRMED: connect() on connected adapter falsely returns false and clears connected');
  }
  {
    const h=harness(), {Adapter}=h.load(root+'/src/lpa/adapters/Adapter.ts');
    const a=new Adapter(h.device(),()=>{});a.connected=true;let calls=0;
    a._execute=async()=>{calls++;throw Error('simulated read failure');};
    await a.refresh();assert.equal(calls,2);assert.equal(a.connected,false);
    results.push('CONFIRMED: refresh() swallows both failed read attempts, fails reconnect fallback, resolves');
  }
  {
    const h=harness(true), {Adapter}=h.load(root+'/src/lpa/adapters/Adapter.ts');let old=0,fresh=0;
    const d1=h.device('same-reader');d1.transmit=async()=>{old++;return '9000';};
    const a=new Adapter(d1,()=>{});await a.execute('test',[]);delete h.registry.Adapters['same-reader'];
    const d2=h.device('same-reader');d2.transmit=async()=>{fresh++;return '9000';};
    const b=new Adapter(d2,()=>{});await b.execute('test',[]);assert.equal(old,2);assert.equal(fresh,0);
    results.push('CONFIRMED: new adapter with reused reader id transmits through old adapter captured in cached runtime');
  }
  {
    const h=harness(), {setupDevices}=h.load(root+'/src/lpa/deviceManager.ts');
    h.slots([{name:'SIM1',available:'false'}]);await setupDevices(()=>{});
    h.slots([{name:'SIM1',available:'true'}]);await setupDevices(()=>{});
    assert.equal(h.registry.Adapters['omapi:SIM1'].device.available,false);
    results.push('CONFIRMED: rediscovery does not update unavailable OMAPI adapter even when native reports available');
  }
  {
    const h=harness(), {setupDevices}=h.load(root+'/src/lpa/deviceManager.ts');let profileRefresh=0,deviceRefresh=0;
    h.registry.Adapters['omapi:SIM1']={device:{refresh:async()=>{deviceRefresh++;}},refresh:async()=>{profileRefresh++;}};
    h.slots([{name:'SIM1',available:'true'}]);await setupDevices(()=>{});
    assert.equal(deviceRefresh,1);assert.equal(profileRefresh,0);
    results.push('CONFIRMED: top refresh discovery does not call Adapter.refresh() for existing reader');
  }
  {
    const h=harness(), {Adapter}=h.load(root+'/src/lpa/adapters/Adapter.ts');const a=new Adapter(h.device(),()=>{});
    a._execute=async c=>{if(c==='download_profile')return {success:true};throw Error('post-install read failed');};
    await assert.rejects(()=>a.downloadProfile('session','',()=>{}),/post-install read failed/);
    results.push('CONFIRMED: successful install is rejected by Adapter when follow-up get_profiles fails');
  }
  {
    const h=harness(), {Adapter}=h.load(root+'/src/lpa/adapters/Adapter.ts');const a=new Adapter(h.device(),()=>{});let n=0;
    a._execute=async()=>{n++;throw Error('response lost');};await assert.rejects(()=>a.execute('delete_profile',['synthetic-profile']));assert.equal(n,2);
    results.push('CONFIRMED: response loss replays delete_profile command twice at Adapter level');
  }
  {
    const h=harness(), {LpaDispatcher}=h.load(root+'/src/lpa/core/dispatcher.ts');const d=new LpaDispatcher({});let sent=0,deleted=0;
    d.lpa={listNotifications:async()=>[{seqNumber:1,profileManagementOperation:128,iccid:'synthetic-profile'}],retrieveNotification:async()=>({payload:'synthetic'}),sendNotification:async()=>{sent++;throw Error('offline');},removeNotification:async()=>{deleted++;}};
    assert.equal((await d.execute('process_notifications',['',128,1])).result,0);assert.equal(sent,1);assert.equal(deleted,0);
    results.push('CONFIRMED: notification batch returns result=0 when every delivery fails (notifications retained)');
  }
  console.log(results.join('\n'));
})().catch(e=>{console.error(e);process.exitCode=1;});
