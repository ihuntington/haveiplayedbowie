/**
    The MIT License

    Copyright (c) 2013-2014 Mick Hansen. http://mhansen.io

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

    Code taken from https://github.com/mickhansen/dottie.js/blob/master/dottie.js
 */

export const pathToObject = (object) => {
    if (Array.isArray(object)) {
        return object.map(function (o) {
            return transform(o);
        });
    }

    var options = {};
    options.delimiter = '.';

    var pieces
        , piecesLength
        , piece
        , current
        , transformed = {}
        , key
        , keys = Object.keys(object)
        , length = keys.length
        , i;

    for (i = 0; i < length; i++) {
        key = keys[i];

        if (key.indexOf(options.delimiter) !== -1) {
            pieces = key.split(options.delimiter);
            piecesLength = pieces.length;
            current = transformed;

            for (var index = 0; index < piecesLength; index++) {
                piece = pieces[index];
                if (index != (piecesLength - 1) && !current.hasOwnProperty(piece)) {
                    current[piece] = {};
                }

                if (index == (piecesLength - 1)) {
                    current[piece] = object[key];
                }

                current = current[piece];
                if (current === null) {
                    break;
                }
            }
        } else {
            transformed[key] = object[key];
        }
    }

    return transformed;
};
