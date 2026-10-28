(function(){
  var $=function(s){return document.querySelector(s)};
  var expr="",deg=true,hist=[],mode="calc",zoom=10,fresh=false,msg="",mx=null;

  var fact=function(n){if(n<0||n!==Math.floor(n)||n>170)return NaN;var r=1;for(var k=2;k<=n;k++)r*=k;return r};
  var z=function(r){return Math.abs(r)<1e-12?0:r};
  var toR=function(v){return deg?v*Math.PI/180:v}, fromR=function(v){return deg?v*180/Math.PI:v};
  var F={sin:function(v){return z(Math.sin(toR(v)))},cos:function(v){return z(Math.cos(toR(v)))},
    tan:function(v){var c=Math.cos(toR(v));return Math.abs(c)<1e-12?NaN:Math.sin(toR(v))/c},
    asin:function(v){return fromR(Math.asin(v))},acos:function(v){return fromR(Math.acos(v))},atan:function(v){return fromR(Math.atan(v))},
    ln:Math.log,log:Math.log10,sqrt:Math.sqrt,abs:Math.abs};

  function tok(s){var t=[],re=/\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+|π|[^\s])/y,m;
    s=s.trim();re.lastIndex=0;while(re.lastIndex<s.length&&(m=re.exec(s)))t.push(m[1]);return t}

  // Recursive-descent parser: no eval(). Throws 1 when x is needed but missing, 0 for syntax errors.
  function ev(s,x){
    var open=(s.match(/\(/g)||[]).length-(s.match(/\)/g)||[]).length;
    if(open>0)s+=")".repeat(open);
    var t=tok(s),i=0;
    var pk=function(){return t[i]},nx=function(){return t[i++]};
    var starts=function(k){return k!==undefined&&/^(\d|\.|[a-zπ√(])/.test(k)};
    function E(){var v=T();while(pk()==="+"||pk()==="−"||pk()==="-"){var o=nx(),r=T();v=o==="+"?v+r:v-r}return v}
    function T(){var v=U();for(;;){var k=pk();
      if(k==="×"||k==="*"){nx();v*=U()}else if(k==="÷"||k==="/"){nx();v/=U()}else if(starts(k)){v*=U()}else return v}}
    function U(){var k=pk();if(k==="−"||k==="-"){nx();return -U()}if(k==="+"){nx();return U()}return W()}
    function W(){var b=Q();if(pk()==="^"){nx();return Math.pow(b,U())}return b}
    function Q(){var v=P();for(;;){if(pk()==="!"){nx();v=fact(v)}else if(pk()==="%"){nx();v/=100}else return v}}
    function P(){var k=nx();if(k===undefined)throw 0;
      if(k==="("){var v=E();if(nx()!==")")throw 0;return v}
      if(k==="√")return Math.sqrt(P());
      if(/^[\d.]/.test(k))return parseFloat(k);
      if(k==="π")return Math.PI;if(k==="e")return Math.E;
      if(k==="x"){if(x===undefined)throw 1;return x}
      if(F[k]){if(nx()!=="(")throw 0;var a=E();if(nx()!==")")throw 0;return F[k](a)}
      throw 0}
    var r=E();if(i<t.length)throw 0;return r}

  function fmt(n){if(!isFinite(n))return"Error";
    if(n!==0&&(Math.abs(n)>=1e12||Math.abs(n)<1e-6))return n.toExponential(8).replace(/\.?0+e/,"e").replace("e+","e");
    return String(parseFloat(n.toPrecision(12)))}

  function render(){
    $("#ex").textContent=expr||"0";
    var p="",rs=$("#rs");rs.className="";
    if(msg){p=msg;rs.className="err"}
    else if(expr&&!fresh){try{var v=fmt(ev(expr));if(v!=="Error"&&v!==expr)p="= "+v}catch(e){}}
    rs.textContent=p||"\u00a0";
    $("#mode").textContent=deg?"DEG":"RAD";$("#mb").textContent=deg?"DEG":"RAD";
    if(mode==="graph")draw();
  }
  function add(s){
    msg="";
    if(fresh){if(/^[\d.a-zπ√(x]/.test(s))expr="";fresh=false}
    expr+=s;render()}
  function equals(){
    try{var v=ev(expr),n=fmt(v);
      if(n==="Error"){msg="Undefined result";render();return}
      hist.unshift({e:expr,r:n});hist=hist.slice(0,40);expr=n;fresh=true;msg="";drawHist();render();
    }catch(e){
      if(e===1){setTab("graph")}else{msg="Check the expression";render()}}}

  function act(k){
    if(k==="AC"){expr="";fresh=false;msg="";render()}
    else if(k==="DEL"){msg="";if(fresh){expr="";fresh=false}else{expr=expr.replace(/(?:[a-z]+\(|.)$/,"")}render()}
    else if(k==="EQ")equals();
    else if(k==="MODE"){deg=!deg;render()}
    else add(k)}
  $("#keys").addEventListener("click",function(e){var b=e.target.closest("button");if(b)act(b.dataset.k)});
  document.addEventListener("keydown",function(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return;var k=e.key;
    if(/^[0-9.()^!%x]$/.test(k))add(k);
    else if(k===",")add(".");else if(k==="+")add("+");else if(k==="-")add("−");
    else if(k==="*")add("×");else if(k==="/"){e.preventDefault();add("÷")}
    else if(k==="p")add("π");
    else if(k==="Enter"||k==="="){e.preventDefault();equals()}
    else if(k==="Backspace")act("DEL");else if(k==="Escape")act("AC")});

  function setTab(t){
    mode=t;
    document.querySelectorAll(".tabs button").forEach(function(b){b.setAttribute("aria-selected",b.dataset.tab===t)});
    $("#pg").hidden=t!=="graph";$("#ph").hidden=t!=="hist";
    if(t==="graph")draw();}
  document.querySelector(".tabs").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setTab(b.dataset.tab)});

  function drawHist(){
    var h=$("#hl");h.textContent="";
    if(!hist.length){var d=document.createElement("div");d.className="empty";d.textContent="Results appear here. Tap one to reuse it.";h.appendChild(d);return}
    hist.forEach(function(it){var b=document.createElement("button");
      var s=document.createElement("small");s.textContent=it.e;b.appendChild(s);b.appendChild(document.createTextNode("= "+it.r));
      b.onclick=function(){expr=it.r;fresh=true;msg="";setTab("calc");render()};h.appendChild(b)})}

  // Graphing
  var nice=function(r){var p=Math.pow(10,Math.floor(Math.log10(r))),m=r/p;return(m<2?1:m<5?2:5)*p};
  function f(x){try{return ev(expr,x)}catch(e){return NaN}}
  function draw(){
    var c=$("#cv"),r=c.getBoundingClientRect();if(!r.width)return;
    var d=window.devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;
    var g=c.getContext("2d");g.scale(d,d);
    var W=r.width,H=r.height,cs=getComputedStyle(document.body),
      gr=cs.getPropertyValue("--grid"),ax=cs.getPropertyValue("--axis"),ink=cs.getPropertyValue("--ink"),dim=cs.getPropertyValue("--dim"),cv=cs.getPropertyValue("--curve");
    var xr=zoom,yr=xr*H/W,st=nice(xr/4);
    var X=function(v){return(v/xr+1)/2*W},Y=function(v){return H/2-v/yr*H/2};
    g.font="11px system-ui,sans-serif";g.lineWidth=1;
    for(var a=Math.ceil(-xr/st)*st;a<=xr;a+=st){g.strokeStyle=gr;g.beginPath();g.moveTo(X(a),0);g.lineTo(X(a),H);g.stroke();
      if(Math.abs(a)>st/2){g.fillStyle=dim;g.fillText(String(parseFloat(a.toPrecision(6))),X(a)+3,H-4)}}
    for(var b=Math.ceil(-yr/st)*st;b<=yr;b+=st){g.strokeStyle=gr;g.beginPath();g.moveTo(0,Y(b));g.lineTo(W,Y(b));g.stroke();
      if(Math.abs(b)>st/2){g.fillStyle=dim;g.fillText(String(parseFloat(b.toPrecision(6))),4,Y(b)-3)}}
    g.strokeStyle=ax;g.beginPath();g.moveTo(X(0),0);g.lineTo(X(0),H);g.moveTo(0,Y(0));g.lineTo(W,Y(0));g.stroke();
    if(!/x/.test(expr)){g.fillStyle=dim;g.font="13px system-ui,sans-serif";g.fillText("Type an expression with x, or pick one below",12,22);return}
    g.strokeStyle=cv;g.lineWidth=2;g.beginPath();var pen=false,py=0;
    for(var px=0;px<=W;px+=1){var x=(px/W*2-1)*xr,y=f(x),sy=Y(y);
      if(!isFinite(y)||Math.abs(sy)>1e5||(pen&&Math.abs(sy-py)>H)){pen=false;continue}
      if(pen)g.lineTo(px,sy);else{g.moveTo(px,sy);pen=true}py=sy}
    g.stroke();
    if(mx!==null){var tx=(mx/W*2-1)*xr,ty=f(tx);
      if(isFinite(ty)){g.fillStyle=cv;g.beginPath();g.arc(mx,Y(ty),4,0,7);g.fill();
        g.fillStyle=ink;g.font="12px system-ui,sans-serif";
        g.fillText("x = "+parseFloat(tx.toPrecision(4))+"   y = "+parseFloat(ty.toPrecision(4)),10,18)}}}
  var cvEl=$("#cv");
  cvEl.addEventListener("pointermove",function(e){mx=e.offsetX;draw()});
  cvEl.addEventListener("pointerleave",function(){mx=null;draw()});
  cvEl.addEventListener("wheel",function(e){e.preventDefault();zoom=Math.min(200,Math.max(.5,zoom*(e.deltaY>0?1.15:.87)));draw()},{passive:false});
  $("#zi").onclick=function(){zoom=Math.max(.5,zoom*.7);draw()};
  $("#zo").onclick=function(){zoom=Math.min(200,zoom/.7);draw()};
  document.querySelectorAll(".chip").forEach(function(b){b.onclick=function(){expr=b.dataset.f;fresh=false;msg="";render()}});
  window.addEventListener("resize",function(){if(mode==="graph")draw()});
  if(window.matchMedia)matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){if(mode==="graph")draw()});

  drawHist();render();
})();