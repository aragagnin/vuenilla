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
        /*const props = {
        v_for: node.getAttribute('v-for'),
        old_len: 0,
        last_sibling: null,
        prev_node: node.previousElementSibling,
        parent_node: node.parentNode,
        v_for_item: node.getAttribute('v-for-item') || '$item',
        v_for_index: node.getAttribute('v-for-index') || '$index',
        v_for_parent: node.getAttribute('v-for-parent') || '$parent',
        parent_node: node.parentNode,
        keys: Object.keys(_)
        }
        */
        
        yield ()=>{
            
        }
        
        //if (props.v_for != null) 
        { //for the minifier or it crasehs
            node.removeAttribute('v-for')
            node.removeAttribute('v-for-item')
            node.removeAttribute('v-for-index')
            node.removeAttribute('v-for-parent')
            node.remove();
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
                    node.removeAttribute(attr.name);
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
                    const plugin = plugins[plugink];
                    console.log(plugink)
                    yield *plugin(node, attr, params, plugins, root)
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
        plugins = {model:vModel, 'for':vFor, ...(plugins || {})}
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
