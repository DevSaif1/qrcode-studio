const $ = id => document.getElementById(id);
let type = 'url', logo = null, stream = null, scanning = false;

/* ---------- أدوات ---------- */
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000)}
const debounce=(f,ms=200)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)}};
const wifiEsc = s => s.replace(/([\\;,:"])/g,'\\$1');

function getData(){
  if(type==='url') return $('urlInput').value.trim();
  if(type==='text') return $('textInput').value.trim();
  const enc=$('enc').value, pass=enc==='nopass'?'':wifiEsc($('wpass').value);
  const ssid=$('ssid').value;
  return ssid?`WIFI:T:${enc};S:${wifiEsc(ssid)};P:${pass};H:${$('hidden').checked};;`:'';
}

function options(size){
  return {
    width:size, height:size, type:'canvas',
    data:getData()||' ', image:logo||undefined, margin:0,
    qrOptions:{errorCorrectionLevel:'H'},
    dotsOptions:{color:$('fg').value,type:$('dots').value},
    cornersSquareOptions:{color:$('fg').value},
    backgroundOptions:{color:$('bg').value},
    imageOptions:{crossOrigin:'anonymous',margin:6,imageSize:.28}
  };
}

/* ---------- التوليد ---------- */
const qr = new QRCodeStyling(options(300));
qr.append($('qr'));
function render(){ qr.update(options(+$('size').value)); }
const renderSoon = debounce(render);

['urlInput','textInput','ssid','wpass','enc','hidden','fg','bg','dots'].forEach(id=>{
  $(id).addEventListener('input',renderSoon);
  $(id).addEventListener('change',renderSoon);
});
$('size').addEventListener('input',e=>{$('sizeVal').textContent=e.target.value;render()});
$('genBtn').onclick=()=>{ if(!getData()) toast('أدخل محتوى أولاً'); else {render();toast('تم توليد الرمز ✓')} };

document.querySelectorAll('#typeSeg button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#typeSeg button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); type=b.dataset.type;
  document.querySelectorAll('.type-box').forEach(x=>x.hidden=true);
  $('box-'+type).hidden=false; render();
});

/* الشعار */
$('logoFile').onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{logo=r.result;$('rmLogo').hidden=false;render()};
  r.readAsDataURL(f);
};
$('rmLogo').onclick=()=>{logo=null;$('logoFile').value='';$('rmLogo').hidden=true;render()};

/* ---------- التصدير ---------- */
async function hiResBlob(){
  const big=new QRCodeStyling(options(1024));
  return await big.getRawData('png');
}
$('dlBtn').onclick=async()=>{
  if(!getData()) return toast('أدخل محتوى أولاً');
  const blob=await hiResBlob(), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='qr-code.png'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('تم التنزيل ✓');
};
$('copyImg').onclick=async()=>{
  try{
    const blob=await hiResBlob();
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
    toast('تم نسخ الصورة ✓');
  }catch{toast('المتصفح لا يدعم نسخ الصور، استخدم التنزيل')}
};
$('copyTxt').onclick=()=>copy(getData());
async function copy(t){
  if(!t) return toast('لا يوجد محتوى');
  try{await navigator.clipboard.writeText(t);toast('تم النسخ ✓')}catch{toast('تعذر النسخ')}
}

/* ---------- القراءة ---------- */
function showResult(text){
  $('result').hidden=false; $('resultText').textContent=text;
  const link=$('openRes'), isUrl=/^https?:\/\//i.test(text);
  link.hidden=!isUrl; if(isUrl) link.href=text;
}
function decode(img,w,h){
  const c=$('scanCanvas'),ctx=c.getContext('2d',{willReadFrequently:true});
  c.width=w;c.height=h;ctx.drawImage(img,0,0,w,h);
  return jsQR(ctx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'attemptBoth'});
}
$('scanFile').onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  const img=new Image();
  img.onload=()=>{
    const code=decode(img,img.naturalWidth,img.naturalHeight);
    code?showResult(code.data):toast('لم يتم العثور على رمز QR في الصورة');
    URL.revokeObjectURL(img.src);
  };
  img.src=URL.createObjectURL(f); e.target.value='';
};
async function startCam(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const v=$('video'); v.srcObject=stream; await v.play();
    $('videoWrap').hidden=false; $('camBtn').textContent='⏹ إيقاف الكاميرا'; scanning=true; tick();
  }catch{toast('تعذر الوصول إلى الكاميرا')}
}
function stopCam(){
  scanning=false; stream&&stream.getTracks().forEach(t=>t.stop()); stream=null;
  $('videoWrap').hidden=true; $('camBtn').textContent='📷 تشغيل الكاميرا';
}
function tick(){
  if(!scanning) return;
  const v=$('video');
  if(v.readyState===v.HAVE_ENOUGH_DATA){
    const code=decode(v,v.videoWidth,v.videoHeight);
    if(code){showResult(code.data);stopCam();toast('تمت القراءة ✓');return}
  }
  requestAnimationFrame(tick);
}
$('camBtn').onclick=()=>scanning?stopCam():startCam();
$('copyRes').onclick=()=>copy($('resultText').textContent);

/* ---------- التبويبات والثيم ---------- */
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  $('generate').hidden=b.dataset.mode!=='generate';
  $('scan').hidden=b.dataset.mode!=='scan';
  if(b.dataset.mode!=='scan') stopCam();
});
function setTheme(t){document.documentElement.dataset.theme=t;$('themeBtn').textContent=t==='dark'?'☀️':'🌙';try{localStorage.setItem('qr-theme',t)}catch{}}
let saved;try{saved=localStorage.getItem('qr-theme')}catch{}
setTheme(saved||'dark');
$('themeBtn').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
render();