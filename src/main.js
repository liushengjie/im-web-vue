// polyfill
import 'babel-polyfill';

import Vue from 'vue';
import App from './App';
import store from './store';
import * as push from './push/push'

Vue.config.devtools = true;

new Vue({
    el: 'body',
    components: { App },
    store: store
});

push.push.connect({
    url: "ws://183.196.130.91:3020/",
    deviceId: "web-1005",
    osName: "web " + navigator.userAgent,
    osVersion: "55.2",
    clientVersion: "1.0"
});
