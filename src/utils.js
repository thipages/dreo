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
cosh x	cosinus hyperbolique de x (en radians)
exp x	exponentielle de x (ou e^x)
ln x	logarithme népérien de x (ou log x)
log10 x	logarithme de x en base 1
log2 x	logarithme de x en base 2
not x	opérateur logiue NOT
sin x	sinus de x (en radians)
sinh x	sinus hyperbolique de x (x is in radians)
sqrt x	racine carrée de x
tan x	tangente de x (en radians)
tanh x	tangente hyperbolique de x (en radians)
atan2(y, x)	Arc tangente de x/y. Angle entre (0, 0) and (x, y) en radians
`

export const helpFunctions = help
    .split('\n').map(v=>v.split('\t'))
    .filter (v => v.length === 2)
    .map (v => `<div class="bold small">${v[0]}</div><div class="small">${v[1]}</div>`)
    .join('')


export const sample = 
`#L=1000
r20
-r36
--a20
--t10
-t18
d0
r100
-a228.6
-d1
-aL
-a-L
-d0
-a-228.6
-t3.6

t-90
a400
t90

a-35
d1
r36
-a69.9
-t10`
