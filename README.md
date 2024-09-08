# Vuenilla

Vuenilla is a minimalistic, simple, and lightweight JavaScript framework inspired by Vue. Vuenilla is designed to be loaded from CDN for single-page projects, where the typical `node.js` compilation step is an overkill.

Why not just use Vue 1.0, you may ask? As opposed to Vue1.0, Vuenilla makes strong use of modern JS native functionalities wherever possible. Here are the main differences with other frameworks:

- Vuenilla does not implement its own string parsing/templating, it relies on JS string literals, and callbacks are executed in a safe way using JS `Function` constructor.
- Similarly to Vue, Vuenilla reactivity is based on JS `Proxy`.
- Vuenilla doesn't manage events for the user. The user must build native JS `Event`.  
- Vuenillia is minimalistic and the current minified version (1.0.4) occupies 8KB.

 
## Quickstart

You can find the latest stable version (1.0.0) of Vuenilla [here](https://velvety-meerkat-759da6.netlify.app/vuenilla.js) and the minified version [here](https://velvety-meerkat-759da6.netlify.app/vuenilla.min.js).

To test Vuenilla, copy-paste these lines of code on an HTML file:

```html
<script src="https://velvety-meerkat-759da6.netlify.app/vuenilla.min.js"></script> 
<h1 id="app">  ${message} </h1>
<script defer>
  Vuenilla.bootstrap(document.getElementById("app"), {message: 'Hello World!'})
</script>
```

## Functionalities by examples

- [Live example](https://jsfiddle.net/aragagnin/puh8ocdt/4/): use JS string templating, manage events, and bind property attributes
- [Live example](https://jsfiddle.net/aragagnin/jyfpht6q/1/): two-way binding to input components using `v-model`
- [Live example](https://jsfiddle.net/aragagnin/5yLq8w2v/8/): CSS class and styles binding
- [Live example](https://jsfiddle.net/aragagnin/xvakr2yp/4/): conditional rendering of `v-if`/`v-else-if`/`v-else` statements, and `v-for` loops
- [Live example](https://jsfiddle.net/aragagnin/mbdwje6a/15/): creating new (sub-)components from `<template/>` tags
- [Live example](https://jsfiddle.net/aragagnin/93q7ze1h/6/): creating new (sub-)components from a JS object
- [Live example](https://jsfiddle.net/aragagnin/gec8tvmh/19/): components with `<slot>` elements
- [Live example](https://jsfiddle.net/aragagnin/row1shjc/14/): JS getter and setter for watchers
- [Live example](https://jsfiddle.net/aragagnin/m38Lbgdo/9/): re-use logic on multiple components or apps
- [Live example](https://jsfiddle.net/aragagnin/xLhtuvw9/2/): fetch data from the web using async/await

You can try all tests at once here: https://velvety-meerkat-759da6.netlify.app/tests.html

## Contribute, test, and deploy

The file `tests.html` contains a number of apps that can be tested. The scripr `test_and_build.py` do use `selenium` to test them automatically. These tests are executed at each repository push. 

The github CI status: ![workflow result](https://github.com/aragagnin/vuenilla/actions/workflows/main.yml/badge.svg)

If you run `test_and_build.py`, the script will produce a `build` folder with `vuenilla${version}.js` and `vuenilla${version}.min.js`.

## Author and licensing

The author is Antonio Ragagnin (2024), and Vuenilla is released under the MIT license.



