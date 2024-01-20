import {Parser} from 'expr-eval'

const parser = new Parser();
let expr = parser.parse('2 * x + 1 + 2*y');
console.log(expr.tokens); // 7

expr = parser.parse('X');
console.log(expr.tokens); // 7

try {
    expr = parser.parse('X').evaluate()
} catch (e) {
    console.log('error')
}



// or
// Parser.evaluate('6 * x', { x: 7 }) // 42