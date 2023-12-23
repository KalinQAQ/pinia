// 存的是createPinia这个ap
import { ref, effectScope } from "vue";
import { piniaSymbol } from "./rootStore";
export let activePinia; // 全局变量
export const setActivePinia = (pinia) => (activePinia = pinia);
export function createPinia() {
  const scope = effectScope();
  const state = scope.run(() => ref({})); // 用来存储每个store的state的
  // scope.stop() 可以通过一个方法全部停止响应式

  // 状态里面 可能会存放 计算属性， computed
  const _p = [];
  const pinia = {
    use(plugins) {
      _p.push(plugins);
      return this;
    },
    _p,
    _s: new Map(), // 这里用这个map来存放所有的store   {counter1-> store,counter2-> store}
    _e: scope,
    install(app) {
      // 对于pinia而言，我们希望让它去管理所有的store
      // pinia 要去收集所有store的信息 , 过一会想卸载store
      // 如何让所有的store 都能获取这个pinia 对象
      app.provide(piniaSymbol, pinia); // 所有组件都可以通过 app.inject(piniaSymbol)
      // this.$pinia
      app.config.globalProperties.$pinia = pinia; // 让vue2的组件实例也可以共享
    },
    state,
  };
  return pinia;
}
