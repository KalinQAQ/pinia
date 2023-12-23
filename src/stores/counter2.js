import { defineStore } from "@/pinia";
import { ref, computed } from 'vue'
// defineStore中的id是独一无二的
// {counter=> state, counter -> state}
export const useCounterStore2 = defineStore('counter2', () => {

    const count = ref(10)
    const increment = () => {
        count.value *= 2
    }
    const double = computed(() => {
        return count.value * 2
    })

    return { count, increment, double }

})
// options API  -> composition API