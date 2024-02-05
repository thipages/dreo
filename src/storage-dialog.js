import {html, render} from 'uhtml'

export default () => {}
//render (document.body, html`tit`)

function listElement({id, text}, clicked) {
    return html`
        <button data-id=${id} onclick=${clicked}>${text}</button>
    `
}
export function dialogHTML(data, clicked) {
    const style = data.length === 0 ? 'display:block' : 'display:none'
    const c = e => {
        return clicked(e.target.dataset.id)
    }
    return html`
        <h3 class="center">Sauvegardes</h3>
        <div class="container-ls">
            <pre style=${style}>Pas encore de sauvegarde</pre>
            ${data.map(v => listElement (v, c))}
        </div>
        <p>
            <form class="center padding" method="dialog">
                <button class="button">Fermer</button>
            </form>
        </p>
    `
}