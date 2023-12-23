<script setup>
import { useCounterStore1 } from "@/stores/counter1";
import { useCounterStore2 } from "./stores/counter2";
import { storeToRefs } from "@/pinia/storeToRefs";
const store1 = useCounterStore1();
const { increment } = useCounterStore1();
const handleClick1 = () => {
  increment(3);
};

const handleReset1 = () => {
  store1.$reset();
};

const store2 = useCounterStore2();

const handleClick2 = () => {
  store2.increment(3);
};

store2.$subscribe(function (storeInfo, state) {
  // 状态
  console.log(storeInfo, state);
});

// 此方法是发布订阅
store2.$onAction(function ({ after, onError }) {
  // 方法
  console.log("action running", store2.count);
  after(() => {
    console.log("action after", store2.count);
  });
  after(() => {
    console.log("action after", store2.count);
  });

  onError((err) => {
    console.log("error", err);
  });
});

const handleDispose = () => {
  // store1._p._e.stop() //我们可以终止所有的effect，但是官方没给i这个方法
};

// 我们使用pinia解构store 不要用toRefs 要使用 storeToRefs 可以跳过函数的处理
const { count, double } = storeToRefs(store1); // toRefs 的原理
</script>

<template>
  ----------------options-------------- <br />
  {{ store1.count }} /
  {{ store1.double }}
  <button @click="handleClick1">修改状态</button>
  <button @click="handleReset1">重置状态</button>
  <button @click="handleDispose">卸载响应式</button>
  <hr color="red" />

  ----------------setup--------------<br />
  {{ store2.count }}
  {{ store2.double }}

  <button @click="handleClick2">修改状态</button>
  <button @click="handleDispose">卸载响应式</button>
</template>

<style scoped></style>

https://pinia.vuejs.org/
