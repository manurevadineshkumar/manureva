<script>
import Api from "../services/Api.js";

export default {
    data() {
        return {
            counts: null,
            total: 0
        };
    },

    async mounted() {
        const {
            data: {total, status, error, ...counts}
        } = await Api.getProductsStatistics();

        if (error)
            return alert("Error: " + error);

        Object.assign(this, {counts, total});
    }
};
</script>

<template>
<div class="statistics">
    <h1>Product statistics</h1>
    <table v-if="counts" class="statistics-table">
        <tbody>
        <tr v-for="(count, name) in counts">
            <th>{{ name[0].toLocaleUpperCase() + name.substring(1).toLocaleLowerCase() }}:</th>
            <td>{{ count }}</td>
            <td>
                <span
                    class="statistics-bar"
                    :class="{['statistics-bar-' + name.toLocaleLowerCase()]: true}"
                    :style="{width: count / total * 100 + '%'}"
                ></span>
            </td>
        </tr>
        <tr>
            <th>Total:</th>
            <td>{{ total }}</td>
            <td></td>
        </tr>
        </tbody>
    </table>
</div>
</template>

<style>
.statistics {
    box-sizing: border-box;
    align-self: start;
    padding: 20px;
    margin: 0;
    background: var(--see-through-grey);
    border-radius: 10px;
    width: 100%;
}
.statistics-table th, .statistics-table td {
    text-align: right;
    padding-right: 10px;
}
.statistics-table th {
    font-weight: normal;
}
.statistics-table td {
    font-size: 12pt;
    font-family: monospace;
}
.statistics-table tr:last-child > * {
    padding-top: 10px;
}
.statistics-table td:last-child {
    width: 100%;
}
.statistics-table .statistics-bar {
    --color: var(--white-color);
    display: block;
    border-radius: 100px;
    background: var(--color);
    height: 4px;
    opacity: .4;
}
.statistics-table .statistics-bar-sold { --color: var(--bright-blue); }
.statistics-table .statistics-bar-pending { --color: var(--bright-yellow); }
.statistics-table .statistics-bar-active { --color: var(--bright-green); }
.statistics-table .statistics-bar-disabled { --color: var(--magenta-blue); }
.statistics-table .statistics-bar-locked { --color: var(--indigo-blue); }
</style>
