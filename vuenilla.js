/* Vuenilla.js v1.0, Antonio Ragagnin (2024), Released under the MIT License */
"use strict";
(function(exports){
  
  /* 
  Checks if the given template string contains templating tags.
  executing "return is_dyn_tag`this string contains string ${templates}`" will return true
  while  "return is_dyn_tag`this string do not need templates" will return false
  */
  const is_dyn_tag = (strings, ...keys) => keys.length>0;
  
  /*
  Name of the current component inside interpolated functions.
  Callbacks can access component's variable throught this variable name.
  Namely, if ME='_', then the user will write components like this <button @click="_.fireEvent()">
  */
  const ME='_';
  
  /*
  Function that is called to obtain the result of a string templating.
  For instance, suppose we have a HTML element <button @click="_.fireEvent()">,
  then, on render event, Vuenilla will call  new_function(null, {_}, '_.fireEvent()');
  where _ stores the status of the component
  
  `_this`: the current execution context.
  `params`: the parameters to be passed into the function.
  `content`: the JavaScript code or template to be executed within the function.
  `additional_params`: any additional parameters that need to be passed (optional).
  */
  const new_function = function(_this, params, content, additional_params){
    additional_params = additional_params||{}
    const keys = Object.keys(params)
    const values = Object.values(params)
    const window_keys =  Object.keys(window).filter((k)=>  !/\d/.test(k[0]) && k!=ME)
    const f = new Function(ME, ...keys, ...Object.keys(additional_params),'console', 'window',  'globalThis', window_keys, content)
    const call_params = [_this, params, ...values, ...Object.values(additional_params)]
    return f.call(...call_params)
  }
  
  /*
  Function to interpolate a template string with provided parameters. 
  For instance, if we have an element like <snap>the message is ${message}</span>
  then Vuenilla will render it using interpolate(_, 'the message is ${message}', _),
  where _ stores the status of the component
  
  `_this`: the current execution context.
  `s`: the template string to be interpolated.
  `params`: the parameters to replace placeholders in the template string.
  `_tag`: an optional tag to wrap around the template string.
  */
  const interpolate = function(_this, s, params,_tag) {
    const tag = _tag||''  
    return  new_function(_this, params, `return ${tag}\`${s}\`;`,{is_dyn_tag});
  }
  
  //uses the `is_dyn_tag` to check if a literal has templating. will return true for strings containing '${..}'.
  const is_dyn = (s, params) =>  interpolate(null, s,  params, 'is_dyn_tag')
  
  // Symbol used to mark if an object is already a proxy, see
  //https://stackoverflow.com/questions/36372611/how-to-test-if-an-object-is-a-proxy
  const is_proxy = Symbol("is_proxy")
  
  /* Function to check if an object should not be proxied, teturns true if the object is null, undefined, already a proxy, a string, or not a plain object or array */
  const check_noproxy = (_) =>  (_===null) || (_===undefined) || (_[is_proxy]) || (typeof _ === 'string') || (!(_.constructor==Object || _.constructor==Array)) 
  
  /*
  Function to create a proxy for an object, allowing it to trigger render events.
  Note that Vuenilla converts user initial states in JS proxies so it can trigger rendering functions upon user set.
  
  - $el: The DOM element associated with the object
  - _: The object to be proxied
  - _parent: The parent object (used for nested proxies)
  */
  function get_proxy($el, _, _parent){
    if(check_noproxy(_)) return _;
    const res =  new Proxy(_, {
      get(target, key) {
        if(key == is_proxy) return true;
        if(key[0]!='$' && !check_noproxy(target[key])) { //create new proxy for nested objects
          target[key] = get_proxy($el, target[key], _parent||_)
        }
        return target[key]
      }, set (target, key, value, p) {
        target[key] = value 
        if(key[0]!='$'){
          // trigger a rendering on property set
          if(_.$render_count==0) render(_parent||p);
        }
        return true;
      }
    });
    if(!_parent){
      res.$el = $el
      res.$reactive_list = [] //this list is populated by all the dynamic content and will contain the list of things to be rendered
      res.$directives = Object.assign({},  {'v-for':vFor}, _.$directives||{}); //overwrite with $directive if one passed it
      res.$render = (x)=>render(x)
      res.$render_count = 0;
    }
    return res;
  }
  
  /*
  loop over the $reactive_list array, which contain callbacks that render the various dynamic contents.
  Basically, when parsing the DOM, for every attribute text-node in the DOM containing ${..} or every function in @ events,
  Vuenilla will create a JS function to update the string with the new component state.
  Each of these function is appended to the $reactive_list list, here we call them all.
  */
  const render = function(_){ 
    _.$render_count++ // i do not remember why I had this counter
    for(const o of _.$reactive_list){
      o.f(interpolate(null, o.text||'', _)) 
    }
    _.$render_count--
  }
  
  /*
  Deal with v-if, v-else-if, v-else elements and render them accordingly to the result within their interpolated attributes.
  Basically we render the v-if if the (interpolated) content is true (i.e. v-if="..." evaluates to true).
  In that case we propagate a `v-if-result=true`, which will be taken into account by the next v-else-if and v-else elements.
  In case the v-if evalates to false, then the element is not rendered and `v-if-result`  is set to `false`, so the next element
  in the chain of v-if/v-else-if/v-else can read that attribute to decide if they should render themselves or not.
  */
  function reactive(attr,_, node, _node, sibiling, _next_node){
    return function (){
      const res = new_function(null,_, 'return ' + node.getAttribute(attr));
      const prev = _node.getAttribute("v-if-result")=="true"
      let cond;
      
      if(attr=='v-if') cond = res;
      if(attr=='v-else-if') cond = res && !prev;
      if(attr=='v-else') cond = !prev;
      
      if(_next_node!=null){
        
        if(attr == 'v-if' && (_next_node.hasAttribute('v-else')||_next_node.hasAttribute('v-else-if'))   ){
          
          _next_node.setAttribute("v-if-result",res);
        }
        else if(attr == 'v-else-if' && (_next_node.hasAttribute('v-else')||_next_node.hasAttribute('v-else-if'))   ){
          
          _next_node.setAttribute("v-if-result",cond||res||prev);
          
        } else {
          _next_node.setAttribute("v-if-result","true");
        }
      }
      
      if(cond){
        if(sibiling!=null && sibiling.parentNode!=null ){
          sibiling.parentNode.insertBefore(_node, sibiling.nextSibling);
        }else{
          parent_node.insertAdjacentElement('afterbegin', _node)
        }
      }else{
        _node.remove()
      }
    }
  }
  
  
  /*
  this is used when parsing a sequence of v-if/else-if/else attributes, in order to find the right sibiling where to conditionally render each element
  */
  function next_sibiling(sibiling){
    if(sibiling!=null){
      while( sibiling.nextSibling.nodeType==3){  sibiling = sibiling.nextSibling
      }
    }
    return sibiling;
  }
  
  function is_conditional(node){
    return (node.hasAttribute('v-if') || node.hasAttribute('v-else-if')  || node.hasAttribute('v-else') )
  }
  
  /*
  walk a DOM, add render function for text elements in a node and implement conditional render for v-if/v-else-if/v-if  elements.
  For every children, then, we set it up recursively.
  */
  function conditional_walk(parent_node, _){
    let sibiling = null;
    for (const node of parent_node.childNodes) {
      if(node.nodeType==3){//text element
        const text = node.nodeValue;
        try{
          if(is_dyn(text, _)) {
            _.$reactive_list.push({text, f:(text)=>node.nodeValue = text});     
          }
        }catch(error){
          //console.log('Problematic string:',text)
          console.warn('Vuenilla: problematic text node:',node)
          throw new Error(error.message);
        }
      } else if(node.nodeType == 1  && node.tagName!='SCRIPT') {//a node
        let next_element;
        if(is_conditional(node)){
          sibiling = next_sibiling(sibiling);
          next_element =  node.nextElementSibling;
          const attr = node.hasAttribute('v-if')?'v-if':(node.hasAttribute('v-else-if')?'v-else-if':'v-else');
          _.$reactive_list.push({f: reactive(attr,_,node, node, sibiling,   next_element )});
          node.remove();
        }else{
          sibiling = node;
        }
        setup(node, _,parent_node)
      } 
    }
    
  }
  
  
  /*
  returns the function to render elements inside a v-for element
  */
  function iteration(_,node,props){
    const get_l = (_) =>new_function(null,_, 'const l=[]; for(const e of '+props.v_for+'){l.push(e)}; return l');
    const insert_before = (new_node)=> {
      if(props.prev_node!=null)
        props.parent_node.insertBefore(new_node, props.prev_node.nextElementSibling)
      else
      props.parent_node.insertAdjacentElement('afterbegin', new_node)
      props.prev_node = new_node;
    }
    return function (){
      const l = get_l(_)
      
      for(let i=0; i<l.length; i++){
        if(i<props.old_len) continue;
        const item = l[i];
        const new_node = node.cloneNode(true)
        insert_before(new_node);
        const my_ = get_proxy(node, Object.assign({}, _))
        my_[props.v_for_index] = i;
        const f= ()=>{
          const l = get_l(_);
          if (i in l){
            my_[props.v_for_item] = l[i];
          }
          
        };
        f();
        _.$reactive_list.push({node: new_node, f})
        
        setup(new_node, my_)
        
      }
      
      for(let i=l.length; i<props.old_len; i++){ //in case the new list is shorter than the number of created elements, I remove them
        const prev_prev_node = props.prev_node;
        props.prev_node = props.prev_node.previousElementSibling ;
        _.$reactive_list = _.$reactive_list.filter(o=>prev_prev_node!=o.node)
        prev_prev_node.remove()
      }
      props.old_len = l.length
    }
  }
  
  /*
  implements the v-for directive
  */
  function vFor(node, attr, _, _parent){
    //const template_node = node.cloneNode(true);
    const props = {
      v_for: node.getAttribute('v-for'),
      old_len:0,
      last_sibling:null,
      prev_node:node.previousElementSibling,
      parent_node:node.parentNode,
      v_for_item:node.getAttribute('v-for-item')||'$item',
      v_for_index:node.getAttribute('v-for-index')||'$index',
      parent_node: node.parentNode,
      keys: Object.keys(_)
    }
    
    
    _.$reactive_list.push({
      f: iteration(_,node,props)
    });
    if(props.v_for!=null){ //for the minifier or it crasehs
      node.removeAttribute('v-for')
      node.removeAttribute('v-for-item')
      node.removeAttribute('v-for-index')
      node.remove();
    }
  }
  
  // implements the `:` binding
  function vColon($el, attr, _){
    const field_name = attr.name.substring(1);
    _.$reactive_list.push({
      f:()=> {
        try{
          setAttribute($el, field_name,  new_function($el, _, 'return ' + attr.value))
        }catch(error){
          console.warn("Vuenilla: problematic DOM element",$el,"attribute",attr);
          throw new Error(error.message);
        }
      }
    })
  }
  
  // implments `:style=...`
  function vStyle($el, attr, _){
    const old_style = $el.getAttribute('style')||''
    _.$reactive_list.push({
      f:function() {
        try{
          const dict = new_function($el, _, 'return ' + attr.value);
          const additional_css = Object.entries(dict).map(([k,v])=> k.replace(ME,'-') + ':' + v)
          $el.setAttribute('style',  [old_style, ...additional_css].join(';'))
        }catch(error){
          console.warn("Vuenilla: problematic DOM element",$el,"attribute",attr);
          throw new Error(error.message);
        }
      }
    })
  }
  
  
  // implments `:class=...`
  function vClass($el, attr, _){
    const is_string = value => typeof value === 'string';
    const old_class = $el.getAttribute('class')||''
    _.$reactive_list.push({ 
      f:()=> {
        try{
          const l = new_function($el, _, 'return ' + attr.value);
          if(is_string(l)) 
            throw new Error(":class variable must be a list of strings, not a string.")
          $el.setAttribute('class', [old_class, ...l].join(' ') )
        }catch(error){
          console.warn("Vuenilla: problematic DOM element",$el,"attribute",attr);
          throw new Error(error.message);
        }
      }
    }); 
  }
  
  //implements v-model=.. directive to create a two-way binding of input, textarea and select objects
  function vModel($el, attr, _){
    let model = attr.value
    let value = 'value'
    let event = '@input'
    if(!_.hasOwnProperty(model)){
      console.warn("Vuenilla: problematic v-model node: ", $el,"attribute",attr)
      throw Error(`No property named ${model}`);
    }
    if($el.tagName=='INPUT' || $el.tagName=='TEXTAREA' || $el.tagName=='SELECT' ){
      if($el.getAttribute('type')=='checkbox'){
        value = 'checked'
      }
      
      let attr = {name:event, value: " _."+model+"= this."+value}
      {
        const ev_name = attr.name.substring(1);
        $el.addEventListener(ev_name, (event) => {
          new_function($el, _, attr.value, {event})
          _.$el.dispatchEvent(new Event('render')) //may be wrong, you may need _.$root...
        } )
      }
      _.$reactive_list.push({f:() =>  setAttribute ($el, value, _[model])})
      setAttribute ($el, value, _[model])
      
    }
  }
  
  
  /*
  mount a component either from the DOM or the $component list
  */
  function vMount($el, attr_value, _, _parent){
    
    const my_target = {$parent:$el, $root:_.$el, _parent:_parent}
    const my_ = get_proxy($el,my_target )
    for(const attr of $el.attributes){
      if(attr.name[0]==':'){
        const attr_name = attr.name.substring(1);
        const f = ()=>  my_[attr_name] = new_function(null,_,  'return '+attr.value);
        _.$reactive_list.push({f});
        my_target[attr_name] = new_function(null,_,  'return '+attr.value);
        $el.removeAttribute(attr.name);
      }
    }
    let template_el;
    if(_.$components && attr_value in _.$components){
      const component  = _.$components[attr_value]
      const html = component.$html
      const wrapper= document.createElement('div');
      wrapper.innerHTML= html;
      template_el = wrapper //.firstChild; I do not need to get first child here because I get the `.content` later
      for(const [key, value] of Object.entries(component)){
        my_[key] = value
      }
    }else{
      template_el = document.getElementById( attr_value).content.cloneNode(true)
    }
    
    let script = null;
    
    while(template_el.childNodes.length>0){
      const node = template_el.childNodes[0]
      
      if(node.tagName=='SCRIPT'){ 
        script = node.innerHTML;
        node.remove()
      }else{
        $el.appendChild(node);
      }
    }
    if(script)
      new_function(null,my_,  script)
    return my_
    
  }
  
  // helper function to combine setAttribute with value and checked.
  const setAttribute = function($el, attr_name, value) { 
    if(attr_name=='value') $el.value = value;
    else if(attr_name=='checked') $el.checked = value;
    else $el.setAttribute(attr_name, value)
  }
  
  // implements the `@` directive 
  function vAt($el, attr, _){
    const ev_name = attr.name.substring(1);
    $el.addEventListener(ev_name, (event) => {
      try{
        new_function($el, _, attr.value, {event})
      }catch(error){
        console.warn("Vuenilla: problematic DOM element",$el,"attribute",attr);
        throw new Error(error.message);
      }
      _.$el.dispatchEvent(new Event('render')) //may be wrong, you may need _.$root...
    } )
  }
  
  
  //set up a object: basically loop over its attribute and children.
  //for each attribute we check if we should add it to the render list
  //or if it belong to a given directive
  //for each children,  we recursively walk it.
  function setup($el, _dict, parent_node){
    
    _dict = get_proxy($el, _dict)
    const _parent = _dict //will change if there is a v-mount
    const v_mounted = parent_node?false:true;
    let v_mount = false //check if v-mount is in this element, used to append slot
    const children = []; //possible v-mount children slots
    if($el.hasAttribute('v-mount')) {
      //vmount remove children and append them after the setup
      //because their scope is of the father component
      for(const child of $el.children){
        setup(child, _dict, parent_node)
        children.push(child);
      } 
      for(const child of $el.children){
        child.remove();
      }
      $el.innerHTML=''
      v_mount = true;
      _dict = vMount($el, $el.getAttribute('v-mount'), _dict, parent_node);
      $el.removeAttribute('v-mount');
    }
    for(const attr of $el.attributes){
      let remove_attribute = true;
      if(attr.name==':style') vStyle($el, attr, _parent)
        else if(attr.name==':class') vClass($el, attr, _parent)
          else if(attr.name[0]==':' && _dict==_parent) vColon($el, attr, _parent)//execute only if not a v-mount object: in that case I already processed
      else if(attr.name[0]=='@') vAt($el, attr, _parent) 
        else if(attr.name=='v-model') vModel($el, attr, _parent)
          else if(_parent.$directives && attr.name in _parent.$directives) _parent.$directives[attr.name]($el, attr, _parent, parent_node);
      else {
        remove_attribute = false;
        if(is_dyn(attr.value, _parent)){
          _parent.$reactive_list.push({text: attr.value, f:(text)=>setAttribute($el, attr.name, text) }); 
        }
      }    
      if(remove_attribute){
        //  $el.removeAttribute(attr.name)
      }
    }
    
    if('$' in _parent.$directives && v_mounted){ //here you can customise the mounting process
      _parent.$directives.$($el, null, _parent, parent_node);
    }
    if(document.body.contains($el)){ //if element was removed, by a directive (e.g. v-for) we do not walk
      conditional_walk($el, _dict)
    }
    $el.addEventListener('render', ()=>render(_dict)) 
    
    if(v_mounted){ //here you can customise the mounting process
      $el.dispatchEvent(new Event('mount'))
    }
    if(v_mount){ //add slots
      const slots = $el.getElementsByTagName('slot');
      const slots_done = new Set();
      const child_dict = {}
      for(const child of children){
        const name = child.tagName.toLowerCase();
        if(name in child_dict){
          console.warn("Vuenilla: problematic template element: ",child)
          throw Error(`two slot named %{name}`);          
        }
        child_dict[name] = child;
      }
      for(const slot of slots){
        const name = slot.getAttribute('name')||'default'
        if(name in child_dict){
          const child = child_dict[name]
          slot.innerHTML=''
          slot.appendChild(child.firstChild)
        }
      }
      
      
    }
    return _dict;
  }
  
  //the bootstrap function just call setup and render it
  function bootstrap($el, _dict){
    let _ = setup($el, _dict)
    _.$render(_);
    return _;
  }
  
  exports.version = '1.0.4'
  exports.bootstrap = bootstrap;
  
})(typeof exports === 'undefined'? this['Vuenilla']={}: exports);
