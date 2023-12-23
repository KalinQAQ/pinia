import { createApp } from "vue";
import App from "./App.vue";

import { createPinia } from "@/pinia";

const app = createApp(App);

// 基本上咱们js中的插件都是函数

const pinia = createPinia();

pinia.use(function ({ store }) {
  let local = localStorage.getItem(store.$id + "PINIA_STATE");
  if (local) {
    store.$state = JSON.parse(local);
  }

  store.$subscripe(({ storeId: id }, state) => {
    localStorage.setItem(id + "PINIA_STATE", JSON.stringify(state));
  });
});

pinia.use(function () {});

app.use(pinia); // 插件要求得有一个install方法

app.mount("#app");
