(() => {
 'use strict';
 const data=window.TRIP_DATA;
 const mobile=document.body.classList.contains('mobile-guide');
 const $=s=>document.querySelector(s);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!data?.trip||!Array.isArray(data.days)||!Array.isArray(data.meals)){
  $('#setup-error').hidden=false;$('.day-layout').hidden=true;return;
 }
 const storageKey=`travel-planner:${data.trip.id}:outing:v2`;
 let stored={};try{stored=JSON.parse(localStorage.getItem(storageKey))||{}}catch{}
 const state={dayId:data.days.some(d=>d.id===stored.dayId)?stored.dayId:data.days[0].id,hotelId:data.trip.confirmedHotelId||(['hilton','wyndham'].includes(stored.hotelId)?stored.hotelId:'hilton'),diet:stored.diet==='mild'?'mild':'normal',checks:stored.checks||{}};
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{}};
 let timer;
 const toast=text=>{$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),2300)};
 const dateText=date=>`${Number(date.slice(5,7))}月${Number(date.slice(8,10))}日`;
 const mapUrl=visit=>{
  if(!Number.isFinite(visit.longitude)||!Number.isFinite(visit.latitude)){
   return 'https://uri.amap.com/search?'+new URLSearchParams({keyword:`${visit.navigationName} ${visit.address||''}`,city:visit.city||'张家界市',view:'list',src:'travel-guide',callnative:'1'});
  }
  const q=new URLSearchParams({from:'',to:`${visit.longitude},${visit.latitude},${visit.navigationName}`,mode:'car',src:'travel-guide',callnative:'1'});
  return 'https://uri.amap.com/navigation?'+q;
 };
 const restaurantCard=(c,primary=false)=>{
  const v=c.visit||{};
  const mild=state.diet==='mild';
  const dishes=mild?v.mildOrder:v.normalOrder;
  return `<article class="restaurant-card ${primary?'primary':''}" data-restaurant-id="${esc(c.id)}">
   <div class="restaurant-top"><div><p class="card-label">${primary?(mild?'不辣时先问这家':'这餐推荐'):'换一家也可以'}</p><h3>${esc(c.name)}</h3></div><span class="food-tag">${esc(c.category)}</span></div>
   <p class="restaurant-feature">${esc(v.feature)}</p>
   <div class="dinner-grid"><section class="order-box"><h4>${mild?'完全不辣，先问这套':'四人先这样点'}</h4><ul>${(dishes||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>${esc(mild?v.mildTip:v.normalTip)}</p></section>
   <section class="budget-box"><span>四人预算参考</span><strong>${esc(v.budget)}</strong><small>${esc(v.perPerson)}</small><p>${esc(v.budgetNote||'按人均估算；实际以菜单、份量和点单为准。')}</p></section></div>
   <dl class="contact-facts"><div><dt>地图店名</dt><dd>${esc(v.navigationName||c.name)}</dd></div><div><dt>地址</dt><dd>${esc(c.base?.location)}</dd></div><div><dt>电话</dt><dd>${v.phone?`<a href="tel:${esc(v.phone)}">${esc(v.phone)}</a>`:'号码未查到；请在地图店铺页查看'}</dd></div><div><dt>营业时间</dt><dd>${esc(c.base?.hours)}</dd></div></dl>
   <div class="contact-actions"><a class="button filled" target="_blank" rel="noopener noreferrer" href="${esc(mapUrl({...v,address:c.base?.location,navigationName:v.navigationName||c.name}))}"><span aria-hidden="true">↗</span> ${Number.isFinite(v.longitude)&&Number.isFinite(v.latitude)?'打开导航':'地图找这家'}</a>${v.phone?`<a class="button" href="tel:${esc(v.phone)}">拨打电话</a>`:''}<button class="button" type="button" data-action="copy-address" data-restaurant-id="${esc(c.id)}">复制店名与地址</button></div>
   <p class="contact-note">${esc(v.contactTip)}</p>
  </article>`;
 };
 const renderMeals=day=>{
  const meals=data.meals.filter(m=>m.dayId===day.id&&(!m.hotelId||m.hotelId===state.hotelId));
  const hotel=(day.lodging||[])[0];
  const diet=`<div class="meal-controls"><div class="confirmed-hotel"><small>${day.id==='d5'?'今天返程':'今晚已定住宿'}</small><b>${esc(hotel?.name||'按班次送机／送站')}</b></div><div class="diet-control" role="group" aria-label="选择用餐辣度"><button type="button" data-action="set-diet" data-diet="normal" aria-pressed="${state.diet==='normal'}">正常点菜</button><button type="button" data-action="set-diet" data-diet="mild" aria-pressed="${state.diet==='mild'}">完全不辣</button></div></div>`;
  const spice=state.diet==='mild'?`<div class="spice-note"><b>点单时这样说</b><p>${esc(data.trip.noSpiceRequest)}</p><small>先请店员确认今天有售、能完全不放辣；不要只说“微辣”。包含的团餐也提前说。</small></div>`:'';
  $('#meal-content').innerHTML=diet+spice+meals.map(m=>{
   const all=m.candidates||[];
   const order=['primary','backup2','backup3'].map(k=>m.selected?.[k]).filter(Boolean);
   const preferred=state.diet==='mild'?m.mildPreferredId:order[0];
   const main=all.find(c=>c.id===preferred)||all.find(c=>c.id===order[0])||all[0];
   const alternatives=all.filter(c=>c.id!==main?.id);
   const plan=m.actionPlan?`<aside class="meal-plan"><h4>${esc(m.actionPlan.title)}</h4><p>${esc(m.actionPlan.note)}</p>${m.actionPlan.phone?`<div class="contact-actions"><a class="button" href="tel:${esc(m.actionPlan.phone)}">电话确认酒店晚餐</a></div>`:''}</aside>`:'';
   return `<section class="meal-block" data-meal-id="${esc(m.id)}"><div class="meal-intro"><span class="food-tag">${m.included?'已包含':'自理'}</span><h3>${esc(m.publicLabel||m.label)}</h3><p>${esc(m.publicNote||m.hotelAdvice||m.note)}</p></div>${main?restaurantCard(main,true):''}${alternatives.length?`<details class="alternatives"><summary>查看另外${alternatives.length===2?'两':alternatives.length}家餐厅 <span aria-hidden="true">＋</span></summary><div>${alternatives.map(c=>restaurantCard(c)).join('')}</div></details>`:''}${plan}</section>`;
  }).join('');
 };
 const renderLodging=day=>{
  const lodgings=day.lodging||[];
  let hotels=lodgings;
  if(day.id==='d1')hotels=lodgings.filter(h=>h.id===state.hotelId);
  const card=h=>`<article class="hotel-card"><span>${esc(h.label)}</span><h3>${esc(h.name)}</h3>${h.address?`<p>${esc(h.address)}</p>`:''}${h.phone?`<a href="tel:${esc(h.phone)}">${esc(h.phone)}</a>`:''}${h.stay?`<div class="stay-times"><span>入住 ${esc(h.stay.checkIn)}</span><span>退房 ${esc(h.stay.checkOut)}</span></div><div class="breakfast-box"><b>明早早餐 ${esc(h.stay.breakfastTime)}</b><p>${esc(h.stay.breakfastPlace)}<br>${esc(h.stay.breakfastCredential)}</p></div><details class="stay-tips"><summary>入住小贴士</summary><ul>${h.stay.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}</article>`;
  $('#hotel-content').innerHTML=hotels.length?card(hotels[0])+(hotels.length>1?`<details class="hotel-backups"><summary>查看备选住宿</summary>${hotels.slice(1).map(card).join('')}</details>`:''):'<p class="small-note">今天返程，无当晚住宿。</p>';
 };
 const renderChecks=day=>{
  const checks=data.checks.filter(c=>!c.dayId||c.dayId===day.id);
  $('#check-content').innerHTML=checks.length?checks.map(c=>`<label class="check-card"><input type="checkbox" data-action="toggle-check" data-check-id="${esc(c.id)}" ${state.checks[c.id]?'checked':''}><span><b>${esc(c.title)}</b><small>${esc(c.verify)}</small></span></label>`).join(''):'<p class="small-note">留意导游通知的集合时间；午餐正餐无法安排时，随身零食作备选。</p>';
 };
 const render=()=>{
  document.title=data.trip.title+'｜旅行攻略';
  document.querySelectorAll('[data-bind]').forEach(el=>el.textContent=data.trip[el.dataset.bind]||'');
  const day=data.days.find(d=>d.id===state.dayId)||data.days[0];
  $('#day-tabs').innerHTML=data.days.map((d,i)=>`<button type="button" data-action="select-day" data-day-id="${esc(d.id)}" aria-pressed="${d.id===day.id}"><small>${mobile?dateText(d.date):`第${i+1}天 · ${dateText(d.date)}`}</small><span>${mobile?`第${i+1}天`:esc(d.shortLabel)}</span></button>`).join('');
  $('#day-date').textContent=day.label.split('／')[0]+' · '+dateText(day.date);
  $('#day-title').textContent=day.title;
  $('#day-meal-summary').textContent=day.mealSummary;
  renderMeals(day);renderLodging(day);renderChecks(day);
  $('#route-content').innerHTML=(day.stops||[]).map((s,i)=>`<li><span class="stop-number">${String(i+1).padStart(2,'0')}</span><div><span class="stop-time">${esc(s.time)}</span><h3>${esc(s.title)}</h3><p>${esc(s.note)}</p></div></li>`).join('');
 };
 const copyText=async text=>{
  try{await navigator.clipboard.writeText(text);return true}catch{}
  const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
  let result=false;try{result=document.execCommand('copy')}catch{}input.remove();return result;
 };
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  if(button.dataset.action==='select-day'){state.dayId=button.dataset.dayId;save();render();document.querySelector(`[data-day-id="${state.dayId}"]`).scrollIntoView({block:'nearest',inline:'nearest'});return}
  if(button.dataset.action==='set-diet'){state.diet=button.dataset.diet==='mild'?'mild':'normal';save();render();return}
  if(button.dataset.action==='copy-address'){
   const c=data.meals.flatMap(m=>m.candidates||[]).find(c=>c.id===button.dataset.restaurantId);if(!c)return;
   const ok=await copyText(`${c.visit.navigationName||c.name}\n${c.base.location}${c.visit.phone?'\n电话：'+c.visit.phone:''}`);toast(ok?'已复制店名与地址':'未能自动复制，请长按店名与地址复制。');
  }
 });
 document.addEventListener('change',event=>{
  if(event.target.id==='hotel-select'&&!data.trip.confirmedHotelId){state.hotelId=event.target.value;save();render()}
  if(event.target.matches('[data-action="toggle-check"]')){state.checks[event.target.dataset.checkId]=event.target.checked;save()}
 });
 render();
})();
