import { colornames } from 'color-name-list';
const map = {};
for (const c of colornames) map[c.name.toLowerCase()] = c.hex;
const need = ['Lime Green','Waiouru','Navy Blue','sky','Bottle Green','Mustard Yellow','Black & White mix','Magenta Pink','Black & Gold mix','Ash','Light Blue'];
for (const n of need) console.log(String(n).padEnd(20), map[n.toLowerCase()] ?? '(NOT IN LIST -> nearest/fallback)');
console.log('\nlist entries:', colornames.length);
