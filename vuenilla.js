/* Vuenilla.js v2.0, Antonio Ragagnin (2025), Released under the MIT License */
"use strict";
(function(exports) {
    const TEXT_NODE = 3
    const is_dyn_tag = (strings, ...keys) => keys.length > 0;
    
    const new_function = function(params, content, that) {
        try{
            const f = new Function(...Object.keys(params), content)
            const res = f.call(that||this, ...Object.values(params))
            return res
        }catch (err){
            console.log('parms',params, 'content',content)
            throw err;
        }
    }
    
    const interpolate = function(s, params,_tag) {
        const tag = _tag?'is_dyn_tag':''; 
        return  new_function(params, `return ${tag}\`${s}\`;`);
    }
    
    const is_dyn = function(s, params){
        const res = interpolate(s,  {is_dyn_tag, ...params}, 'is_dyn_tag');
        return res;
    }
    
    const setAttribute = function($el, attr_name, value) {
        if (attr_name == 'value') $el.value = value;
        else if (attr_name == 'checked') $el.checked = value;
        else $el.setAttribute(attr_name, value)
    }
    
    function *vModel($el, attr, _, plugins, root) {
        let model = attr.value
        let value = 'value'
        const ev_name = 'input'
        if ($el.tagName == 'INPUT' || $el.tagName == 'TEXTAREA' || $el.tagName == 'SELECT') {
            if ($el.getAttribute('type') == 'checkbox') {
                value = 'checked'
            }
            $el.addEventListener(ev_name, (event) => {
                _[model] = $el[value]
                root.dispatchEvent(new Event('render')) //may be wrong, you may need _.$root...
            })
            yield  () => setAttribute($el, value, _[model])
            setAttribute($el, value, _[model])
            
        }
    }
    
    function *vFor(node, attr, _, plugins, _parent) {
        //const template_node = node.cloneNode(true);
        const v_for = node.getAttribute('v-for');
        const v_for_item = node.getAttribute('v-for-item') || '_item'
        const v_for_index = node.getAttribute('v-for-index') || '_index'
        const v_for_root = node.getAttribute('v-for-root') || '_root'
        const child = node.firstElementChild;
        node.removeChild(child);
        yield ()=>{
            const l = new_function(_, 'return '+v_for);
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            l.forEach((item,index)=>{
                const new_child = child.cloneNode(true)
                node.appendChild(new_child)
                const __ = {}
                __[v_for_item] = l[index]
                __[v_for_index] = index
                __[v_for_root] = _
                bootstrap(new_child, __, plugins)
            })            
        }
    }    
    function *vConditional(node, attr, _, plugins, _parent) {
        const conditions = [];
        while (node.firstElementChild) {
            conditions.push([node.firstElementChild.getAttribute('v-condition'),node.firstElementChild])
            node.removeChild(node.firstElementChild);
        }
        yield ()=>{
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            for(let i = 0; i<conditions.length; i++){
                const [condition, child] = conditions[i]
                const new_child = child.cloneNode(true)
                const criteria = (i<(conditions.length-1))?new_function(_, 'return '+condition):true;
                if((i<(conditions.length-1) && (condition===null)) ||
                (i==(conditions.length-1) && (condition!==null))){
                    console.log(node)
                    console.log(child)
                    throw Error("v-conditional non-last block criteria can't be null")
                }
                if(i==(conditions.length-1) || criteria){
                    node.appendChild(new_child)
                    bootstrap(new_child, _, plugins)
                    break;
                }
            }
        }
    }
    
    function* yield_templates(node, params, plugins, root) {
        if (node.nodeType === TEXT_NODE && is_dyn(node.nodeValue, params)) {
            const template = node.nodeValue;
            yield ()=>node.nodeValue = interpolate(template, params);
        } else if (node.attributes!==undefined) { 
            for (const attr of node.attributes) {
                const attr_value = attr.value;
                if (attr.name == ':style') {
                    const old_style = node.getAttribute('style') || ''
                    yield () =>{
                        const dict = new_function(params, 'return ' + attr.value);
                        const additional_css = Object.entries(dict).map(([k, v]) => k.replace('_', '-') + ':' + v)
                        const new_style = [old_style, ...additional_css].join(';')
                        setAttribute(node, 'style', new_style)
                    }
                }  else if (attr.name == ':class') {
                    const is_string = value => typeof value === 'string';
                    const old_class = node.getAttribute('class') || ''
                    yield () => {
                        const l = new_function(params, 'return ' + attr.value);
                        if (is_string(l))
                            throw new Error(":class variable must be a list of strings, not a string.")
                        const new_class = [old_class, ...l].join(' ');
                        setAttribute(node, 'class', new_class)
                    }
                } else if (attr.name[0] == ':') {
                    const attr_name = attr.name.substring(1);
                    yield () => node.setAttribute(attr_name, new_function(params, 'return ' + attr_value));
                } else  if (attr.name[0] == '@') {
                    const that = params;
                    const ev_name = attr.name.substring(1);
                    const attr_value = attr.value;
                    node.addEventListener(ev_name, (event) => {
                        new_function({}, 'return '+attr_value, that)(event)
                        root.dispatchEvent(new Event('render'))
                    })
                } else  if(attr.name.startsWith('v-')){
                    const plugink = attr.name.substring(2);
                    if (plugink in plugins){
                        const plugin = plugins[plugink];
                        yield *plugin(node, attr, params, plugins, root)
                    }
                }
            }
        } 
        if (node.isConnected) {
            for (const child of node.childNodes) {
                
                yield* yield_templates(child,params, plugins, root);
            }
        }
    }    
    function bootstrap(node, params, plugins, render_callback) {
        plugins = {conditional: vConditional, model:vModel, 'for':vFor, ...(plugins || {})}
        const l = [...yield_templates(node, params, plugins, node)]
        const render = () => {
            for(const f of l){f();};
            if(render_callback) render_callback()
            };
        node.addEventListener('render',  render);
        node.dispatchEvent(new Event('render'))
        return {render} 
    }    
    
    Object.assign(exports, {interpolate, bootstrap, setAttribute, version:'1.0.6'})
    
})(typeof exports === 'undefined' ? this['Vuenilla'] = {} : exports);
