# calc-extension

(C) Martin Väth <martin@mvath.de>

This project is under the GNU Public License 2.0.

A WebExtension: Calculate values of mathematical expressions

The extension is supposed to be useful for everybody quickly needing
brief or mid-long calculations: in daily “browser” life, as a
mathematician, or as a programmer - there is support for all needs.
Since version 2.0, quite some usability features have been added to support
more lengthy sessions (saving/restoring, exporting to clipboard, etc).

The original motivation was to experiment with a Pratt parser.
Thus, although currently only “simple” formulas of javascript type are
implemented, it would be relatively easy to extend it to a full-blown
programming language.
(Readers interested in the parser implementation can check data/js/parser.js).

After installing __calc-extension__, it can be used as follows.

Click the __calc-extension__ symbol `1+2` or the link on the options page.
Then a page opens where you can enter a formula (see below) which will be
calculated when you press the solver button (`~>`).
(There is an option to use the enter key instead if you prefer.)
The result is then shown and you can enter the next formula.
You can also go back to an earlier entered formula and “recalculate” it
(e.g. after you modified some variables).
To remove a formula from your list, simply remove the main formula text
and press the solver button.

A simple formula is a usual mathematical expression which consists of numbers,
the usual operators `+` `-` `*` `/` and braces `(` `)`.

**Note that `*` must be used for multiplication (not `x`)**

_As usual in computer notation (but unlike to mathematical convention),_
_ellipsis of the multiplication operator_ `*` _is not supported._

Numbers have the usual floating-point format, e.g. `17`  `0.1` `1.2e-3`,
or they can be octal or hexadecimal: For an octal number start with `0`,
for a hexadecimal number start with `0x`.

There are further operators which can be used in expressions:

- `%` remainder (“modulo”)
- `**` exponentiation (binds from right to left)
- `&` bitwise AND
- `|` bitwise OR
- `^` bitwise XOR

There are also some mathematical functions available.
Note that the arguments of these functions have to be in braces.

- `log10(x)` the base 10 logarithm of x
- `log2(x)` the base 2 logarithm of x
- `log(x)` the natural logarithm (base E) of x
- `log1p(x)` = log(1+x)
- `exp(x)` the exponential function (base E) of x
- `expm1(x)` = exp(x) - 1
- `sin(x)` the sine of x (x is in radians)
- `cos(x)` the cosine of x (x is in radians)
- `tan(x)` the tangent of x (x is in radians)
- `asin(x)` the arcsine of x, in radians
- `acos(x)` the arccosine of x, in radians
- `atan(x)` the arctangent of x, in radians
- `sinh(x)` the hyperbolic sine of x
- `cosh(x)` the hyperbolic cosine of x
- `tanh(x)` the hyperbolic tangent of x
- `asinh(x)` the hyperbolic arccosine of x
- `acosh(x)` the hyperbolic arccosine of x
- `atanh(x)` the hyperbolic arctangent of x
- `sqrt(x)` the square root of x, that is `x ** (1/2)`
- `cbrt(x)` the cube root of x, that is `x ** (1/3)`
- `abs(x)` the absolute value of x
- `sign(x)` the signum of x (1, 0, or -1)
- `floor(x)` the value of x rounded down to its nearest integer
- `ceil(x)` the value of x rounded up to its nearest integer
- `trunc(x)` the value of x rounded to the integer of smaller absolute value
- `round(x)` the value of x rounded to its nearest integer
- `fround(x)` the value of x rounded to the nearest 32 bit float
- `clz32(x)` the number of leading zero bits in a 32 bit representation

Furthermore, there are constants available:

- `E` Euler's number exp(1)
- `PI` the circle number acos(-1)
- `SQRT2` sqrt(2)
- `SQRT1_2` sqrt(1/2)
- `LN2` log(2)
- `LN10` log(10)
- `LOG2E` log2(E)
- `LOG10E` log10(E)
- `EPSILON` the difference from 1 to the smallest larger floating point number

Finally, it is possible to define variables with e.g. `a=...` and to use them.
Variable names must only consist of English characters, numbers, or `_`.

The whole syntax and operator precedence is inspired by javascript.
However, the following things are new.

There is a special variable name `#` which always refers to the result of
the last (succesful) calculation.

There are also special sequences which can occur anywhere in an expression
and which cause options to switch (you can also switch them by the mouse).
To modify options more permanently (also for future sessions even across
browser restarts), you have to set them in the preferences window.

- `'width:height'` default is 60:1
- `"base"` switch output to base (2-36)
- `!` Omit the ~> button
- `?` Do not omit the ~> button

The actual calculation of the functions and number conversion occurs
by javascript calls. Therefore, mathematical properties like available
precision, error messages, number limitations, and possible inaccuracies
(and possibly even bugs) are inherited from the javascript interpreter.

## Example session

- `(1+2)*3-5`
- ~> 4
- `1 - cos(2 * PI) / 2`
- ~> 0.5
- `a = (# + 1) * 3`
- ~> 4.5
- `# + 4 * a`
- ~> 22.5
- `0xF | 0100 "16"`
- ~> 4f (in base 16)

## Permissions

The extension requires storage permissions in order to store the options
(and possibly a session) locally.

## Languages

Currently, the following languages are supported:

- en (default language)
- de
