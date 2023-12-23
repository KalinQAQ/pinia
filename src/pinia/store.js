// 这里存放 defineStore的api

// createPinia(), 默认是一个插件具备一个install方法
// _s 用来存储 id->store
// state 用来存储所有状态的
// _e 用来停止所有状态的

// id  + options
// options
// id + setup
import {
  getCurrentInstance,
  inject,
  reactive,
  effectScope,
  computed,
  toRefs,
  isRef,
  isReactive,
} from "vue";
import { piniaSymbol } from "./rootStore";
import { addSubscription, triggerSubscriptions } from "./subscribe";

function isComputed(v) {
  // 计算属性是一个ref 同时也是一个effect
  return !!(isRef(v) && v.effect);
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

// 递归合并两个对象
function mergeReactiveObject(target, state) {
  for (let key in state) {
    let oldValue = target[key];
    let newValue = state[key];

    if (isObject(oldValue) && isObject(state)) {
      target[key] = mergeReactiveObject(oldValue, newValue);
    } else {
      target[key] = newValue;
    }
  }
  return target;
}

function createSetupStore(id, setup, pinia, isOptions) {
  let scope;
  // 后续一些不是用户定义的属性和方法，内置的api会增加到这个store上

  function $patch(partialStateOrMutatior) {
    if (typeof partialStateOrMutatior === "object") {
      // 用新的状态合并老的状态
      mergeReactiveObject(pinia.state.value[id], partialStateOrMutatior);
    } else {
      partialStateOrMutatior(pinia.state.value[id]);
    }
  }
  let actionSubscriptions = [];
  const partialStore = {
    $patch,
    $subscribe(callback, options = {}) {
      // 每次状态变化都会触发此函数
      scope.run(() =>
        watch(
          (pinia.state.value[id],
          (state) => {
            callback({ storeId: id }, state);
          },
          options)
        )
      );
    },
    $onAction: addSubscription.bind(null, actionSubscriptions),
    $dispose() {
      scope.stop(); // 清除响应式
      actionSubscriptions = []; // 取消订阅
      pinia._s.delete(id);
    },
  };

  const store = reactive(partialStore); // store就是一个响应式对象而已

  const initialState = pinia.state.value[id]; // 对于setup api没有初始化过状态

  if (!initialState && !isOptions) {
    // setup API
    pinia.state.value[id] = {};
  }

  // 父亲可以停止所有 , setupStore 是用户传递的属性和方法
  const setupStore = pinia._e.run(() => {
    scope = effectScope(); // 自己可以停止自己
    return scope.run(() => setup());
  });
  function wrapAction(name, action) {
    return function () {
      const afterCallbackList = [];
      const onErrorList = [];
      function after(callback) {
        afterCallbackList.push(callback);
      }
      function onError(callback) {
        onErrorList.push(callback);
      }
      triggerSubscriptions(actionSubscriptions, { after, onError });

      let ret;
      try {
        ret = action.apply(store, arguments);
      } catch (error) {
        triggerSubscriptions(onErrorList, error);
      }

      if (ret instanceof Promise) {
        return ret
          .then((value) => {
            return triggerSubscriptions(afterCallbackList, value);
          })
          .catch((error) => {
            triggerSubscriptions(onErrorList, error);
            return Promise.reject(error);
          });
      }
      triggerSubscriptions(afterCallbackList, ret);
      return ret;
    };
  }
  for (let key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop == "function") {
      // 你是一个action
      // 对action中的this 和 后续的逻辑进行处理 ， 函数劫持
      setupStore[key] = wrapAction(key, prop);
    }

    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      if (!isOptions) {
        pinia.state.value[id][key] = prop;
      }
    }
  }

  store.$id = id;
  pinia._s.set(id, store); // 将store 和 id映射起来
  Object.assign(store, setupStore);

  // 可以操作store的所有属性
  Object.defineProperty(store, "$state", {
    get: () => pinia.state.value[id],
    set: (state) => $patch(($state) => Object.assign($state, state)),
  });

  return store;
}

function createOptionsStore(id, options, pinia) {
  const { state, actions, getters } = options;
  function setup() {
    // 这里面会对用户传递的state，actions getters 做处理
    pinia.state.value[id] = state ? state() : {};

    const localState = toRefs(pinia.state.value[id]); // 需要将状态转成ref，具备响应式
    // getters
    return Object.assign(
      localState, // 用户的状态
      actions, // 用户的动作
      Object.keys(getters || {}).reduce((memo, name) => {
        // 用户计算属性
        memo[name] = computed(() => {
          let store = pinia._s.get(id);
          return getters[name].call(store);
        });
        return memo;
      }, {})
    );
  }
  const store = createSetupStore(id, setup, pinia, true);
  store.$reset = function () {
    const newState = state ? state() : {};
    store.$patch((state) => {
      Object.assign(state, newState); // 默认状态覆盖掉老状态
    });
  };
}
export function defineStore(idOrOptions, setup) {
  let id;
  let options;

  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    options = setup;
  } else {
    options = idOrOptions;
    id = idOrOptions.id;
  }
  // 可能setup是一个函数，这个稍后处理

  const isSetupStore = typeof setup === "function";

  function useStore() {
    // 在这里我们拿到的store 应该是同一个
    let instance = getCurrentInstance();
    const pinia = instance && inject(piniaSymbol);

    if (!pinia._s.has(id)) {
      // 第一次useStore

      if (isSetupStore) {
        createSetupStore(id, setup, pinia);
      } else {
        // 如果是第一次 则创建映射关系
        createOptionsStore(id, options, pinia);
      }
    }
    // 后续通过id 获取对应的store返回

    const store = pinia._s.get(id);

    return store;
  }

  return useStore; // 用户最终拿到是这个store
}
