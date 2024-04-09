<script>
import RoundDivButton from "../ui/buttons/RoundDivButton.vue";

export default {
    name: "EditableTable",

    props: {
        dayRanges: {
            type: Array,
            required: true,
        },
        priceRanges: {
            type: Array,
            required: true,
        },
        discountValues: {
            type: Array,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
    },

    data() {
        return {};
    },

    methods: {
        /**
         * Adds a new row to the editable table.
         * Set the new range to be 100 more than the second-to-last element of the `priceRanges` array.
         * @example [100, null] -> [100, 200, null]
         */
        addRow() {
            const beforeLast = this.priceRanges.slice(-2, -1)[0];

            this.priceRanges[this.priceRanges.length - 1] = beforeLast + 100;
            this.priceRanges.push(null);

            this.discountValues.push(
                Array(this.dayRanges.length).fill(95)
            );
        },

        /**
         * Adds a new column to the editable table.
         * Set the new range to be 30 more than the second-to-last element of the `dayRanges` array.
         * @example [30, null] -> [30, 60, null]
         */
        addColumn() {
            const beforeLast = this.dayRanges.slice(-2, -1)[0];

            this.dayRanges[this.dayRanges.length - 1] = beforeLast + 30;
            this.dayRanges.push(null);

            this.discountValues.forEach((row) => row.push(95));
        },
    },
    computed: {},

    components: {
        RoundDivButton
    }
};
</script>

<template>
    <v-table class="editable-table">
        <thead height="60px">
            <tr>
                <th class="first-column"></th>
                <th class="column" v-for="colIndex of dayRanges.length">
                    <div v-if="dayRanges[colIndex - 1] === null">
                        Above
                    </div>
                    <div v-else>
                        Up to
                        <input
                            type="number"
                            min="0"
                            v-model="dayRanges[colIndex - 1]"
                            style="width: 70px;"
                            @change="checkDayRanges"
                        />
                        days
                    </div>
                </th>
                <th class="last-column">
                    <RoundDivButton @click="addColumn">
                        <h3>
                            +
                        </h3>
                    </RoundDivButton>
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="rowIndex of priceRanges.length" :key="rowIndex">
                <th class="first-column">
                    <div v-if="priceRanges[rowIndex - 1] === null">
                        Above
                    </div>
                    <div v-else>
                        Up to
                        <input
                            type="number"
                            min="0"
                            v-model="priceRanges[rowIndex - 1]"
                            style="width: 100px;"
                            @change="checkPriceRanges"
                        />
                        {{ currency }}
                    </div>
                </th>
                <td
                    class="column"
                    v-for="colIndex of discountValues[rowIndex - 1].length"
                    :key="colIndex"
                >
                    <input
                        type="number"
                        min="0"
                        max="100"
                        v-model="discountValues[rowIndex - 1][colIndex - 1]"
                        style="width: 100px;"
                        @change="checkDiscountValues"
                    />
                </td>
            </tr>
        </tbody>
        <tfoot>
            <tr height="50px">
                <th>
                    <div class="last-row">
                        <RoundDivButton @click="addRow">
                            <h3>+</h3>
                        </RoundDivButton>
                    </div>
                </th>
            </tr>
        </tfoot>
    </v-table>
</template>

<style scoped>
.editable-table {
    min-height: 300px;
    min-width: 600px;
    color: var(--white-color);
    margin: 10px auto;
}

.editable-table thead {
    background-color: var(--grey);
}

.editable-table input {
    background-color: var(--white-color);
}
.first-column {
    background-color: var(--grey);
    width: 230px;
    text-align: end;
}
.last-column, tfoot {
    background-color: var(--white-color);
}

.last-row {
    display: flex;
    justify-content: center;
    margin-top: 15px;
}
.column {
    width: 200px;
    text-align: center;
    padding: 0;
    border-left: none;
    border: 1px solid var(--grey);
}

.v-table > .v-table__wrapper > table tr > th {
    text-align: center;
}

</style>
