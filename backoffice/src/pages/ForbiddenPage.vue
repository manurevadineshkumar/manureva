<template>
<main class="forbidden-page">
    <h1>403</h1>
    <div>
        <p>Forbidden.</p>
        <p>
            You do not have permission to access this page.
            You will be reported as not authorized.
        </p>
        <router-link to="/">Return home</router-link>?
    </div>
</main>
</template>

<style>
main.forbidden-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 20px 40px 40px 40px;
    text-align: center;
}
main.forbidden-page h1 {
    font-size: 160pt;
    color: var(--grey);
    margin: 0;
}
main.forbidden-page p {
    font-size: 14pt;
    color: var(--light-grey-2);
}
</style>
