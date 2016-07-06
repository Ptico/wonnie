export default function makeZbs(ev) {
  ev.preventDefault();

  let element = document.getElementById('zbs');

  element.innerText = `Zbs! ${element.innerText}`;
}
