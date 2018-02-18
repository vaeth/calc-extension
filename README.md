# calc-extension

(C) Martin Väth <martin@mvath.de>

This project is under the GNU Public License 2.0.

A WebExtension: Calculate values of mathematical expressions

After installing __calc-extension__, it can be used as follows.

Click the __calc-extension__ symbol `1+2` or the link on the options page.
Then a page opens where you can enter a formula which will be calculated
when you press the solver button (`=`).

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

- `log(x)` the natural logarithm (base E) of x
- `exp(x)` the exponential function (base E) of x
- `sin(x)` the sine of x (x is in radians)
- `cos(x)` the cosine of x (x is in radians)
- `tan(x)` the tangent of an angle
- `acos(x)` the arccosine of x, in radians
- `asin(x)` the arcsine of x, in radians
- `atan(x)` the arctangent of x, in radians
- `sqrt(x)` the square root of x
- `abs(x)` the absolute value of x
- `floor(x)` the value of x rounded down to its nearest integer
- `ceil(x)` the value of x rounded up to its nearest integer
- `round(x)` the value of x rounded to its nearest integer

Furthermore, there are constants available:

- `E` Euler's number exp(1)
- `PI` the circle number
- `SQRT2` the square root of 2
- `SQRT1_2` the square root of 1/2
- `LN2` the natural logarithm of 2
- `LN10` the natural logarithm of 10
- `LOG2E` base 2 logarithm of E
- `LOG10E` base 10 logarithm of E

Finally, it is possible to define variables with e.g. `a=...` and to use them.
Variable names must only consist of English characters, numbers, or `_`.

The whole syntax and operator precedence is inspired by the javascript
specification. However, the following things are new.

There is a special variable name `#` which always refers to the result of
the last (succesful) calculation.

There are also special sequences which can occur anywhere in an expression:

- `"16"` switch to hexadecimal output from now on.

  Instead of 16 any number between 2 and 36 can be used as the number base.
  Use `""` or `"0"` to reset to the default output (decimal) format.

- `'60:1'` defines the initial size of new input areas to be 60:1.

  Instead of 60 or 1 any other positive integer number can be used.
  Either number (and the `:` part) can be omitted;
  the defaults for omitted values are 60 or 1, respectively.


The actual calculation of the functions and number conversion occurs
by javascript calls. Therefore, available precision, error messages,
number limitations, and possible inaccuracies are inherited from the
javascript interpreter.

## Example session

- `(1+2)*3-5`
- = 4
- `1 - cos(2 * PI) / 2`
- = 0.5
- `a = (# + 1) * 3`
- = 4.5
- `# + 4 * a`
- = 22.5
- `0xF | 0100 "16"`
- = 4f (in base 16)
