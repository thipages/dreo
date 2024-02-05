export const iArray = (num) => Array(num).fill('').map((v,i)=> i)

const help = `
x!	factoriel de x
abs x	valeur absolue de x
acos x	arc cosinus de x (en radians)
acosh x	cosinus hyperbolique réciproque de x (en radians)
asin x	Arc sinus de x (en radians)
asinh x	sinus hyperbolique réciproque de x (en radians)
atan x	arc tangente de x (en radians)
atanh x	tangente hyperbolic réciproque (en radians)
cbrt x	racine cubique
cos x	cosinus de x (en radians)
cosh x	cosinus hyperbolic de x (en radians)
exp x	exponentielle de x (ou e^x)
ln x	logarithme népérien de x (ou log x)
log10 x	logarithme de x en base 1
log2 x	logarithme de x en base 2
not x	opérateur logiue NOT
sin x	sinus de x (en radians)
sinh x	sinus hyperbolique de x (x is in radians)
sqrt x	racine carré de x
tan x	tangente de x (en radians)
tanh x	tangente hyperbolique de x (en radians)
`

export const helpFunctions = help
    .split('\n').map(v=>v.split('\t'))
    .filter (v => v.length === 2)
    .map (v => `<div class="bold small">${v[0]}</div><div class="small">${v[1]}</div>`)
    .join('')
