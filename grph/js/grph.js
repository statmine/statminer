//! moment.js
//! version : 2.7.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.7.0",
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for language config files
        languages = {},

        // moment internal properties
        momentProperties = {
            _isAMomentObject: null,
            _i : null,
            _f : null,
            _l : null,
            _strict : null,
            _tzm : null,
            _isUTC : null,
            _offset : null,  // optional. Combine with _isUTC
            _pf : null,
            _lang : null  // optional
        },

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
        parseTokenOrdinal = /\d{1,2}/,

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
          s: 45,   //seconds to minutes
          m: 45,   //minutes to hours
          h: 22,   //hours to days
          dd: 25,  //days to month (month == 1)
          dm: 45,  //days to months (months > 1)
          dy: 345  //days to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error("Implement me");
        }
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        function printMsg() {
            if (moment.suppressDeprecationWarnings === false &&
                    typeof console !== 'undefined' && console.warn) {
                console.warn("Deprecation warning: " + msg);
            }
        }
        return extend(function () {
            if (firstTime) {
                printMsg();
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        checkOverflow(config);
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }

        if (b.hasOwnProperty("toString")) {
            a.toString = b.toString;
        }

        if (b.hasOwnProperty("valueOf")) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function cloneMoment(m) {
        var result = {}, i;
        for (i in m) {
            if (m.hasOwnProperty(i) && momentProperties.hasOwnProperty(i)) {
                result[i] = m[i];
            }
        }

        return result;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return  Object.prototype.toString.call(input) === '[object Date]' ||
                input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (inputObject.hasOwnProperty(prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment.fn._lang[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment.fn._lang, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0;
            }
        }
        return m._isValid;
    }

    function normalizeLanguage(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        return model._isUTC ? moment(input).zone(model._offset || 0) :
            moment(input).local();
    }

    /************************************
        Languages
    ************************************/


    extend(Language.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment.utc([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Remove a language from the `languages` cache. Mostly useful in tests.
    function unloadLang(key) {
        delete languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        var i = 0, j, lang, next, split,
            get = function (k) {
                if (!languages[k] && hasModule) {
                    try {
                        require('./lang/' + k);
                    } catch (e) { }
                }
                return languages[k];
            };

        if (!key) {
            return moment.fn._lang;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            lang = get(key);
            if (lang) {
                return lang;
            }
            key = [key];
        }

        //pick the language from the array
        //try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        //substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        while (i < key.length) {
            split = normalizeLanguage(key[i]).split('-');
            j = split.length;
            next = normalizeLanguage(key[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                lang = get(split.slice(0, j).join('-'));
                if (lang) {
                    return lang;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return moment.fn._lang;
    }

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {

        if (!m.isValid()) {
            return m.lang().invalidDate();
        }

        format = expandFormat(format, m.lang());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, lang) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return lang.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) { return parseTokenOneDigit; }
            /* falls through */
        case 'SS':
            if (strict) { return parseTokenTwoDigits; }
            /* falls through */
        case 'SSS':
            if (strict) { return parseTokenThreeDigits; }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return getLangDefinition(config._l)._meridiemParse;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return parseTokenOrdinal;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || "";
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(input, 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = getLangDefinition(config._l).isPM(input);
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = getLangDefinition(config._l).weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, lang;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            lang = getLangDefinition(config._l);
            dow = lang._week.dow;
            doy = lang._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual zone can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() + config._tzm);
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {

        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var lang = getLangDefinition(config._l),
            string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }

        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = extend({}, config);
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be "T" or undefined
                    config._f = isoDates[i][0] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += "Z";
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromConfig(config);
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, language) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = language.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < relativeTimeThresholds.s  && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= relativeTimeThresholds.dd && ['dd', days] ||
                days <= relativeTimeThresholds.dm && ['M'] ||
                days < relativeTimeThresholds.dy && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = cloneMoment(input);

            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = lang;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
            "moment construction falls back to js Date. This is " +
            "discouraged and will be removed in upcoming major " +
            "release. Please refer to " +
            "https://github.com/moment/moment/issues/1407 for more info.",
            function (config) {
        config._d = new Date(config._i);
    });

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = lang;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function(threshold, limit) {
      if (relativeTimeThresholds[threshold] === undefined) {
        return false;
      }
      relativeTimeThresholds[threshold] = limit;
      return true;
    };

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var r;
        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(normalizeLanguage(key), values);
        } else if (values === null) {
            unloadLang(key);
            key = 'en';
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
        return r._abbr;
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null &&  obj.hasOwnProperty('_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {

            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function () {
            return this.zone(0);
        },

        local : function () {
            this.zone(0);
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string' && typeof val === 'string') {
                dur = moment.duration(isNaN(+val) ? +input : +val, isNaN(+val) ? val : input);
            } else if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string' && typeof val === 'string') {
                dur = moment.duration(isNaN(+val) ? +input : +val, isNaN(+val) ? val : input);
            } else if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                output += ((this - moment(this).startOf('month')) -
                        (that - moment(that).startOf('month'))) / diff;
                // same as above but with zones, to negate all dst
                output -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.lang());
                return this.add({ d : input - day });
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf: function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = units || 'ms';
            return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
        },

        min: deprecate(
                 "moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548",
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                "moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548",
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        // keepTime = true means only change the timezone, without affecting
        // the local hour. So 5:31:26 +0300 --[zone(2, true)]--> 5:31:26 +0200
        // It is possible that 5:31:26 doesn't exist int zone +0200, so we
        // adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepTime) {
            var offset = this._offset || 0;
            if (input != null) {
                if (typeof input === "string") {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                this._offset = input;
                this._isUTC = true;
                if (offset !== input) {
                    if (!keepTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._d.getTimezoneOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? "UTC" : "";
        },

        zoneName : function () {
            return this._isUTC ? "Coordinated Universal Time" : "";
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
            return input == null ? year : this.add("y", (input - year));
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add("y", (input - year));
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
            return input == null ? weekday : this.add("d", input - weekday);
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this._lang._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.lang().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate("dates accessor is deprecated. Use date instead.", makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate("years accessor is deprecated. Use year instead.", makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);
            data.days = days % 30;

            months += absRound(days / 30);
            data.months = months % 12;

            years = absRound(months / 12);
            data.years = years;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            units = normalizeUnits(units);
            return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
        },

        lang : moment.fn.lang,

        toIsoString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        }
    });

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);
    moment.duration.fn.asMonths = function () {
        return (+this - this.years() * 31536e6) / 2592e6 + this.years() * 12;
    };


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LANGUAGES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    "Accessing Moment through the global scope is " +
                    "deprecated, and will be removed in an upcoming " +
                    "release.",
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === "function" && define.amd) {
        define("moment", function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

// Generated by CoffeeScript 1.6.2
(function() {
  var deprecate, hasModule, makeTwix,
    __slice = [].slice;

  hasModule = (typeof module !== "undefined" && module !== null) && (module.exports != null);

  deprecate = function(name, instead, fn) {
    var alreadyDone;

    alreadyDone = false;
    return function() {
      var args;

      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (!alreadyDone) {
        if ((typeof console !== "undefined" && console !== null) && (console.warn != null)) {
          console.warn("#" + name + " is deprecated. Use #" + instead + " instead.");
        }
      }
      alreadyDone = true;
      return fn.apply(this, args);
    };
  };

  makeTwix = function(moment) {
    var Twix, getPrototypeOf, languagesLoaded;

    if (moment == null) {
      throw "Can't find moment";
    }
    languagesLoaded = false;
    Twix = (function() {
      function Twix(start, end, parseFormat, options) {
        var _ref;

        if (options == null) {
          options = {};
        }
        if (typeof parseFormat !== "string") {
          options = parseFormat != null ? parseFormat : {};
          parseFormat = null;
        }
        if (typeof options === "boolean") {
          options = {
            allDay: options
          };
        }
        this.start = moment(start, parseFormat, options.parseStrict);
        this.end = moment(end, parseFormat, options.parseStrict);
        this.allDay = (_ref = options.allDay) != null ? _ref : false;
      }

      Twix._extend = function() {
        var attr, first, other, others, _i, _len;

        first = arguments[0], others = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        for (_i = 0, _len = others.length; _i < _len; _i++) {
          other = others[_i];
          for (attr in other) {
            if (typeof other[attr] !== "undefined") {
              first[attr] = other[attr];
            }
          }
        }
        return first;
      };

      Twix.defaults = {
        twentyFourHour: false,
        allDaySimple: {
          fn: function(options) {
            return function() {
              return options.allDay;
            };
          },
          slot: 0,
          pre: " "
        },
        dayOfWeek: {
          fn: function(options) {
            return function(date) {
              return date.format(options.weekdayFormat);
            };
          },
          slot: 1,
          pre: " "
        },
        allDayMonth: {
          fn: function(options) {
            return function(date) {
              return date.format("" + options.monthFormat + " " + options.dayFormat);
            };
          },
          slot: 2,
          pre: " "
        },
        month: {
          fn: function(options) {
            return function(date) {
              return date.format(options.monthFormat);
            };
          },
          slot: 2,
          pre: " "
        },
        date: {
          fn: function(options) {
            return function(date) {
              return date.format(options.dayFormat);
            };
          },
          slot: 3,
          pre: " "
        },
        year: {
          fn: function(options) {
            return function(date) {
              return date.format(options.yearFormat);
            };
          },
          slot: 4,
          pre: ", "
        },
        time: {
          fn: function(options) {
            return function(date) {
              var str;

              str = date.minutes() === 0 && options.implicitMinutes && !options.twentyFourHour ? date.format(options.hourFormat) : date.format("" + options.hourFormat + ":" + options.minuteFormat);
              if (!options.groupMeridiems && !options.twentyFourHour) {
                if (options.spaceBeforeMeridiem) {
                  str += " ";
                }
                str += date.format(options.meridiemFormat);
              }
              return str;
            };
          },
          slot: 5,
          pre: ", "
        },
        meridiem: {
          fn: function(options) {
            var _this = this;

            return function(t) {
              return t.format(options.meridiemFormat);
            };
          },
          slot: 6,
          pre: function(options) {
            if (options.spaceBeforeMeridiem) {
              return " ";
            } else {
              return "";
            }
          }
        }
      };

      Twix.registerLang = function(name, options) {
        return moment.lang(name, {
          twix: Twix._extend({}, Twix.defaults, options)
        });
      };

      Twix.prototype.isSame = function(period) {
        return this.start.isSame(this.end, period);
      };

      Twix.prototype.length = function(period) {
        return this._trueEnd(true).diff(this._trueStart(), period);
      };

      Twix.prototype.count = function(period) {
        var end, start;

        start = this.start.clone().startOf(period);
        end = this.end.clone().startOf(period);
        return end.diff(start, period) + 1;
      };

      Twix.prototype.countInner = function(period) {
        var end, start, _ref;

        _ref = this._inner(period), start = _ref[0], end = _ref[1];
        if (start >= end) {
          return 0;
        }
        return end.diff(start, period);
      };

      Twix.prototype.iterate = function(intervalAmount, period, minHours) {
        var end, hasNext, start, _ref,
          _this = this;

        if (intervalAmount == null) {
          intervalAmount = 1;
        }
        _ref = this._prepIterateInputs(intervalAmount, period, minHours), intervalAmount = _ref[0], period = _ref[1], minHours = _ref[2];
        start = this.start.clone().startOf(period);
        end = this.end.clone().startOf(period);
        hasNext = function() {
          return start <= end && (!minHours || start.valueOf() !== end.valueOf() || _this.end.hours() > minHours || _this.allDay);
        };
        return this._iterateHelper(period, start, hasNext, intervalAmount);
      };

      Twix.prototype.iterateInner = function(intervalAmount, period) {
        var end, hasNext, start, _ref, _ref1;

        if (intervalAmount == null) {
          intervalAmount = 1;
        }
        _ref = this._prepIterateInputs(intervalAmount, period), intervalAmount = _ref[0], period = _ref[1];
        _ref1 = this._inner(period, intervalAmount), start = _ref1[0], end = _ref1[1];
        hasNext = function() {
          return start < end;
        };
        return this._iterateHelper(period, start, hasNext, intervalAmount);
      };

      Twix.prototype.humanizeLength = function() {
        if (this.allDay) {
          if (this.isSame("day")) {
            return "all day";
          } else {
            return this.start.from(this.end.clone().add(1, "day"), true);
          }
        } else {
          return this.start.from(this.end, true);
        }
      };

      Twix.prototype.asDuration = function(units) {
        var diff;

        diff = this.end.diff(this.start);
        return moment.duration(diff);
      };

      Twix.prototype.isPast = function() {
        if (this.allDay) {
          return this.end.clone().endOf("day") < moment();
        } else {
          return this.end < moment();
        }
      };

      Twix.prototype.isFuture = function() {
        if (this.allDay) {
          return this.start.clone().startOf("day") > moment();
        } else {
          return this.start > moment();
        }
      };

      Twix.prototype.isCurrent = function() {
        return !this.isPast() && !this.isFuture();
      };

      Twix.prototype.contains = function(mom) {
        mom = moment(mom);
        return this._trueStart() <= mom && this._trueEnd() >= mom;
      };

      Twix.prototype.isEmpty = function() {
        return this._trueStart().valueOf() === this._trueEnd().valueOf();
      };

      Twix.prototype.overlaps = function(other) {
        return this._trueEnd().isAfter(other._trueStart()) && this._trueStart().isBefore(other._trueEnd());
      };

      Twix.prototype.engulfs = function(other) {
        return this._trueStart() <= other._trueStart() && this._trueEnd() >= other._trueEnd();
      };

      Twix.prototype.union = function(other) {
        var allDay, newEnd, newStart;

        allDay = this.allDay && other.allDay;
        if (allDay) {
          newStart = this.start < other.start ? this.start : other.start;
          newEnd = this.end > other.end ? this.end : other.end;
        } else {
          newStart = this._trueStart() < other._trueStart() ? this._trueStart() : other._trueStart();
          newEnd = this._trueEnd() > other._trueEnd() ? this._trueEnd() : other._trueEnd();
        }
        return new Twix(newStart, newEnd, allDay);
      };

      Twix.prototype.intersection = function(other) {
        var allDay, end, newEnd, newStart;

        newStart = this.start > other.start ? this.start : other.start;
        if (this.allDay) {
          end = moment(this.end);
          end.add(1, "day");
          end.subtract(1, "millisecond");
          if (other.allDay) {
            newEnd = end < other.end ? this.end : other.end;
          } else {
            newEnd = end < other.end ? end : other.end;
          }
        } else {
          newEnd = this.end < other.end ? this.end : other.end;
        }
        allDay = this.allDay && other.allDay;
        return new Twix(newStart, newEnd, allDay);
      };

      Twix.prototype.isValid = function() {
        return this._trueStart() <= this._trueEnd();
      };

      Twix.prototype.equals = function(other) {
        return (other instanceof Twix) && this.allDay === other.allDay && this.start.valueOf() === other.start.valueOf() && this.end.valueOf() === other.end.valueOf();
      };

      Twix.prototype.toString = function() {
        var _ref;

        return "{start: " + (this.start.format()) + ", end: " + (this.end.format()) + ", allDay: " + ((_ref = this.allDay) != null ? _ref : {
          "true": "false"
        }) + "}";
      };

      Twix.prototype.simpleFormat = function(momentOpts, inopts) {
        var options, s;

        options = {
          allDay: "(all day)",
          template: Twix.formatTemplate
        };
        Twix._extend(options, inopts || {});
        s = options.template(this.start.format(momentOpts), this.end.format(momentOpts));
        if (this.allDay && options.allDay) {
          s += " " + options.allDay;
        }
        return s;
      };

      Twix.prototype.format = function(inopts) {
        var common_bucket, end_bucket, fold, format, fs, global_first, goesIntoTheMorning, needDate, options, process, start_bucket, together, _i, _len,
          _this = this;

        this._lazyLang();
        if (this.isEmpty()) {
          return "";
        }
        options = {
          groupMeridiems: true,
          spaceBeforeMeridiem: true,
          showDate: true,
          showDayOfWeek: false,
          twentyFourHour: this.langData.twentyFourHour,
          implicitMinutes: true,
          implicitYear: true,
          yearFormat: "YYYY",
          monthFormat: "MMM",
          weekdayFormat: "ddd",
          dayFormat: "D",
          meridiemFormat: "A",
          hourFormat: "h",
          minuteFormat: "mm",
          allDay: "all day",
          explicitAllDay: false,
          lastNightEndsAt: 0,
          template: Twix.formatTemplate
        };
        Twix._extend(options, inopts || {});
        fs = [];
        if (options.twentyFourHour) {
          options.hourFormat = options.hourFormat.replace("h", "H");
        }
        goesIntoTheMorning = options.lastNightEndsAt > 0 && !this.allDay && this.end.clone().startOf("day").valueOf() === this.start.clone().add(1, "day").startOf("day").valueOf() && this.start.hours() > 12 && this.end.hours() < options.lastNightEndsAt;
        needDate = options.showDate || (!this.isSame("day") && !goesIntoTheMorning);
        if (this.allDay && this.isSame("day") && (!options.showDate || options.explicitAllDay)) {
          fs.push({
            name: "all day simple",
            fn: this._formatFn('allDaySimple', options),
            pre: this._formatPre('allDaySimple', options),
            slot: this._formatSlot('allDaySimple')
          });
        }
        if (needDate && (!options.implicitYear || this.start.year() !== moment().year() || !this.isSame("year"))) {
          fs.push({
            name: "year",
            fn: this._formatFn('year', options),
            pre: this._formatPre('year', options),
            slot: this._formatSlot('year')
          });
        }
        if (!this.allDay && needDate) {
          fs.push({
            name: "all day month",
            fn: this._formatFn('allDayMonth', options),
            ignoreEnd: function() {
              return goesIntoTheMorning;
            },
            pre: this._formatPre('allDayMonth', options),
            slot: this._formatSlot('allDayMonth')
          });
        }
        if (this.allDay && needDate) {
          fs.push({
            name: "month",
            fn: this._formatFn('month', options),
            pre: this._formatPre('month', options),
            slot: this._formatSlot('month')
          });
        }
        if (this.allDay && needDate) {
          fs.push({
            name: "date",
            fn: this._formatFn('date', options),
            pre: this._formatPre('date', options),
            slot: this._formatSlot('date')
          });
        }
        if (needDate && options.showDayOfWeek) {
          fs.push({
            name: "day of week",
            fn: this._formatFn('dayOfWeek', options),
            pre: this._formatPre('dayOfWeek', options),
            slot: this._formatSlot('dayOfWeek')
          });
        }
        if (options.groupMeridiems && !options.twentyFourHour && !this.allDay) {
          fs.push({
            name: "meridiem",
            fn: this._formatFn('meridiem', options),
            pre: this._formatPre('meridiem', options),
            slot: this._formatSlot('meridiem')
          });
        }
        if (!this.allDay) {
          fs.push({
            name: "time",
            fn: this._formatFn('time', options),
            pre: this._formatPre('time', options),
            slot: this._formatSlot('time')
          });
        }
        start_bucket = [];
        end_bucket = [];
        common_bucket = [];
        together = true;
        process = function(format) {
          var end_str, start_group, start_str;

          start_str = format.fn(_this.start);
          end_str = format.ignoreEnd && format.ignoreEnd() ? start_str : format.fn(_this.end);
          start_group = {
            format: format,
            value: function() {
              return start_str;
            }
          };
          if (end_str === start_str && together) {
            return common_bucket.push(start_group);
          } else {
            if (together) {
              together = false;
              common_bucket.push({
                format: {
                  slot: format.slot,
                  pre: ""
                },
                value: function() {
                  return options.template(fold(start_bucket), fold(end_bucket, true).trim());
                }
              });
            }
            start_bucket.push(start_group);
            return end_bucket.push({
              format: format,
              value: function() {
                return end_str;
              }
            });
          }
        };
        for (_i = 0, _len = fs.length; _i < _len; _i++) {
          format = fs[_i];
          process(format);
        }
        global_first = true;
        fold = function(array, skip_pre) {
          var local_first, section, str, _j, _len1, _ref;

          local_first = true;
          str = "";
          _ref = array.sort(function(a, b) {
            return a.format.slot - b.format.slot;
          });
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            section = _ref[_j];
            if (!global_first) {
              if (local_first && skip_pre) {
                str += " ";
              } else {
                str += section.format.pre;
              }
            }
            str += section.value();
            global_first = false;
            local_first = false;
          }
          return str;
        };
        return fold(common_bucket);
      };

      Twix.prototype._trueStart = function() {
        if (this.allDay) {
          return this.start.clone().startOf("day");
        } else {
          return this.start.clone();
        }
      };

      Twix.prototype._trueEnd = function(diffableEnd) {
        if (diffableEnd == null) {
          diffableEnd = false;
        }
        if (this.allDay) {
          if (diffableEnd) {
            return this.end.clone().add(1, "day");
          } else {
            return this.end.clone().endOf("day");
          }
        } else {
          return this.end.clone();
        }
      };

      Twix.prototype._iterateHelper = function(period, iter, hasNext, intervalAmount) {
        var _this = this;

        if (intervalAmount == null) {
          intervalAmount = 1;
        }
        return {
          next: function() {
            var val;

            if (!hasNext()) {
              return null;
            } else {
              val = iter.clone();
              iter.add(intervalAmount, period);
              return val;
            }
          },
          hasNext: hasNext
        };
      };

      Twix.prototype._prepIterateInputs = function() {
        var inputs, intervalAmount, minHours, period, _ref, _ref1;

        inputs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (typeof inputs[0] === 'number') {
          return inputs;
        }
        if (typeof inputs[0] === 'string') {
          period = inputs.shift();
          intervalAmount = (_ref = inputs.pop()) != null ? _ref : 1;
          if (inputs.length) {
            minHours = (_ref1 = inputs[0]) != null ? _ref1 : false;
          }
        }
        if (moment.isDuration(inputs[0])) {
          period = 'milliseconds';
          intervalAmount = inputs[0].as(period);
        }
        return [intervalAmount, period, minHours];
      };

      Twix.prototype._inner = function(period, intervalAmount) {
        var durationCount, durationPeriod, end, modulus, start;

        if (period == null) {
          period = "milliseconds";
        }
        if (intervalAmount == null) {
          intervalAmount = 1;
        }
        start = this._trueStart();
        end = this._trueEnd(true);
        if (start > start.clone().startOf(period)) {
          start.startOf(period).add(intervalAmount, period);
        }
        if (end < end.clone().endOf(period)) {
          end.startOf(period);
        }
        durationPeriod = start.twix(end).asDuration(period);
        durationCount = durationPeriod.get(period);
        modulus = durationCount % intervalAmount;
        end.subtract(modulus, period);
        return [start, end];
      };

      Twix.prototype._lazyLang = function() {
        var e, langData, languages, _ref;

        langData = this.start.lang();
        if ((langData != null) && this.end.lang()._abbr !== langData._abbr) {
          this.end.lang(langData._abbr);
        }
        if ((this.langData != null) && this.langData._abbr === langData._abbr) {
          return;
        }
        if (hasModule && !(languagesLoaded || langData._abbr === "en")) {
          try {
            languages = require("./lang");
            languages(moment, Twix);
          } catch (_error) {
            e = _error;
          }
          languagesLoaded = true;
        }
        return this.langData = (_ref = langData != null ? langData._twix : void 0) != null ? _ref : Twix.defaults;
      };

      Twix.prototype._formatFn = function(name, options) {
        return this.langData[name].fn(options);
      };

      Twix.prototype._formatSlot = function(name) {
        return this.langData[name].slot;
      };

      Twix.prototype._formatPre = function(name, options) {
        if (typeof this.langData[name].pre === "function") {
          return this.langData[name].pre(options);
        } else {
          return this.langData[name].pre;
        }
      };

      Twix.prototype.sameDay = deprecate("sameDay", "isSame('day')", function() {
        return this.isSame("day");
      });

      Twix.prototype.sameYear = deprecate("sameYear", "isSame('year')", function() {
        return this.isSame("year");
      });

      Twix.prototype.countDays = deprecate("countDays", "countOuter('days')", function() {
        return this.countOuter("days");
      });

      Twix.prototype.daysIn = deprecate("daysIn", "iterate('days' [,minHours])", function(minHours) {
        return this.iterate('days', minHours);
      });

      Twix.prototype.past = deprecate("past", "isPast()", function() {
        return this.isPast();
      });

      Twix.prototype.duration = deprecate("duration", "humanizeLength()", function() {
        return this.humanizeLength();
      });

      Twix.prototype.merge = deprecate("merge", "union(other)", function(other) {
        return this.union(other);
      });

      return Twix;

    })();
    getPrototypeOf = function(o) {
      if (typeof Object.getPrototypeOf === "function") {
        return Object.getPrototypeOf(o);
      } else if ("".__proto__ === String.prototype) {
        return o.__proto__;
      } else {
        return o.constructor.prototype;
      }
    };
    Twix._extend(getPrototypeOf(moment.fn._lang), {
      _twix: Twix.defaults
    });
    Twix.formatTemplate = function(leftSide, rightSide) {
      return "" + leftSide + " - " + rightSide;
    };
    moment.twix = function() {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Twix, arguments, function(){});
    };
    moment.fn.twix = function() {
      return (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Twix, [this].concat(__slice.call(arguments)), function(){});
    };
    moment.fn.forDuration = function(duration, allDay) {
      return new Twix(this, this.clone().add(duration), allDay);
    };
    moment.duration.fn.afterMoment = function(startingTime, allDay) {
      return new Twix(startingTime, moment(startingTime).clone().add(this), allDay);
    };
    moment.duration.fn.beforeMoment = function(startingTime, allDay) {
      return new Twix(moment(startingTime).clone().subtract(this), startingTime, allDay);
    };
    moment.twixClass = Twix;
    return Twix;
  };

  if (hasModule) {
    module.exports = makeTwix(require("moment"));
  }

  if (typeof define === "function") {
    define("twix", ["moment"], function(moment) {
      return makeTwix(moment);
    });
  }

  if (this.moment != null) {
    this.Twix = makeTwix(this.moment);
  }

}).call(this);

(function() {
  grph = {};


function grph_axis_categorical() {

  var scale = grph_scale_categorical();
  var width;
  var variable, height;
  var tick_format = function(x){return x;};

  var dummy_ = d3.select("body").append("svg")
    .attr("class", "axis_categorical dummy")
    .attr("width", 0).attr("height", 0)
    .style("visibility", "hidden");
  var label_size_ = grph_label_size(dummy_);

  function axis(g) {
    var ticks = axis.ticks();
    g.append("rect").attr("class", "background")
      .attr("width", axis.width()).attr("height", axis.height());
    g.selectAll(".tick").data(ticks).enter()
      .append("line").attr("class", "ticks")
      .attr("x1", axis.width() - settings("tick_length"))
      .attr("x2", axis.width())
      .attr("y1", scale.m).attr("y2", scale.m);
    g.selectAll(".ticklabel").data(ticks).enter()
      .append("text").attr("class", "ticklabel")
      .attr("x", axis.width() - settings("tick_length") - settings("tick_padding"))
      .attr("y", scale.m)
      .text(function(d) { return tick_format(d);})
      .attr("text-anchor", "end")
      .attr("dy", "0.35em");
    g.append("line").attr("class", "axisline")
      .attr("x1", axis.width()).attr("x2", axis.width())
      .attr("y1", 0). attr("y2", axis.height());
  }

  axis.width = function(w) {
    if (arguments.length === 0) {
      var ticks = scale.ticks();
      var max_width = 0;
      for (var i = 0; i < ticks.length; ++i) {
        var lw = label_size_.width(tick_format(ticks[i]));
        if (lw > max_width) max_width = lw;
      }
      width = max_width + settings("tick_length") + settings("tick_padding");
      return width;
    } else {
      width = w;
      return this;
    }
  };

  axis.height = function(h) {
    if (arguments.length === 0) {
      return height;
    } else {
      height = h;
      scale.range([0, h]);
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == 'string' || vschema.type == 'categorical' ||
      vschema.type == 'period';
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable;
    } else {
      variable = v;
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return scale.domain();
    } else {
      if (variable === undefined) return this;
      var vschema = variable_schema(variable, schema);
      var domain = [];
      if (vschema.type == "categorical") {
        domain = vschema.categories.map(function(d) { return d.name; });
      } else {
        var d = data.map(function(d) { return d[variable];});
              // filter out duplicate values
        domain = d.filter(function(value, index, self) {
          return self.indexOf(value) === index;
        });
      }
      tick_format = variable_value_formatter(variable, schema);
      scale.domain(domain);
      return this;
    }
  };

  axis.ticks = function() {
    return scale.ticks();
  };

  axis.scale = function(v) {
    if (typeof v == 'object') {
      return scale(v[variable]).m;
    } else {
      return scale(v).m;
    }
  };

  axis.scale.l = function(v) {
    if (typeof v == 'object') {
      return scale(v[variable]).l;
    } else {
      return scale(v).l;
    }
  };

  axis.scale.u = function(v) {
    if (typeof v == 'object') {
      return scale(v[variable]).u;
    } else {
      return scale(v).u;
    }
  };

  axis.scale.w = function(v) {
    var r;
    if (typeof v == 'object') {
      r = scale(v[variable]);
    } else {
      r = scale(v);
    }
    return r.u - r.l;
  };

  return axis;
}

if (grph.axis === undefined) grph.axis = {};
grph.axis.categorical = grph_axis_categorical();


function grph_axis_chloropleth() {

  var variable;
  var width, height;
  var scale = grph_scale_chloropleth();

  function axis(g) {
  }

  axis.width = function(w) {
    if (arguments.length === 0) {
      return width;
    } else {
      width = w;
      return this;
    }
  };

  axis.height = function(h) {
    if (arguments.length === 0) {
      return height;
    } else {
      height = h;
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == 'number';
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable;
    } else {
      variable = v;
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return scale.domain();
    } else {
      if (variable === undefined) return this;
      scale.domain(d3.extent(data, function(d) { return d[variable];}));
      return this;
    }
  };

  axis.ticks = function() {
    return scale.ticks();
  };

  axis.scale = function(v) {
    if (typeof v == 'object') { 
      return axis.scale(v[variable]);
    } else {
      return scale(v);
    }
  };

  return axis;
}

if (grph.axis === undefined) grph.axis = {};
grph.axis.chloropleth = grph_axis_chloropleth();



function grph_axis_colour() {

  var scale = grph_scale_colour();
  var variable_;
  var width_, height_;

  function axis(g) {
  }

  axis.width = function(width) {
    if (arguments.length === 0) {
      return width_;
    } else {
      width_ = width;
      return this;
    }
  };

  axis.height = function(height) {
    if (arguments.length === 0) {
      return height_;
    } else {
      height_ = height;
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == "categorical" || vschema.type == "period";
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable_;
    } else {
      variable_ = v;
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return scale.domain();
    } else {
      if (variable_ === undefined) {
        scale.domain(undefined);
        return this;
      }
      var vschema = variable_schema(variable_, schema);
      var categories = [];
      if (vschema.type == "categorical") {
        categories = vschema.categories.map(function(d) { return d.name; });
      } else {
        var vals = data.map(function(d) { return d[variable_];}).sort();
        var prev;
        for (var i = 0; i < vals.length; ++i) {
          if (vals[i] != prev) categories.push("" + vals[i]);
          prev = vals[i];
        }
      }
      scale.domain(categories);
      return this;
    }
  };

  axis.ticks = function() {
    return scale.ticks();
  };

  axis.scale = function(v) {
    if (typeof v == 'object') {
      return scale(v[variable_]);
    } else {
      return scale(v);
    }
  };

  return axis;
}

if (grph.axis === undefined) grph.axis = {};
grph.axis.colour = grph_axis_colour();


function grph_axis_linear(horizontal) {

  var scale_ = grph_scale_linear();
  var horizontal_ = horizontal;
  var variable_;
  var width_, height_;
  var origin_;
  var settings_ = {
    "tick_length" : 5,
    "tick_padding" : 2,
    "padding" : 4
  };

  var dummy_ = d3.select("body").append("svg")
    .attr("class", "linearaxis dummy")
    .attr("width", 0).attr("height", 0)
    .style("visibility", "hidden");
  var label_size_ = grph_label_size(dummy_);
  if (horizontal_) scale_.label_size(label_size_.width);
  else scale_.label_size(label_size_.height);
  

  function axis(g) {
    var tick_format = label_size_.format();
    var w = axis.width();
    var ticks = axis.ticks();
    g.append("rect").attr("class", "background")
      .attr("width", w).attr("height", axis.height());
    if (horizontal) {
      g.selectAll(".tick").data(ticks).enter()
        .append("line").attr("class", "tick")
        .attr("x1", scale_).attr("x2", scale_)
        .attr("y1", 0).attr("y2", settings_.tick_length);
      g.selectAll(".ticklabel").data(ticks).enter()
        .append("text").attr("class", "ticklabel")
        .attr("x", scale_).attr("y", settings_.tick_length + settings_.tick_padding)
        .text(function(d) { return tick_format(d);})
        .attr("text-anchor", "middle")
        .attr("dy", "0.71em");
    } else {
      g.selectAll(".tick").data(ticks).enter()
        .append("line").attr("class", "tick")
        .attr("x1", w-settings_.tick_length).attr("x2", w)
        .attr("y1", scale_).attr("y2", scale_);
      g.selectAll(".ticklabel").data(ticks).enter()
        .append("text").attr("class", "ticklabel")
        .attr("x", settings_.padding).attr("y", scale_)
        .text(function(d) { return tick_format(d);})
        .attr("text-anchor", "begin")
        .attr("dy", "0.35em");
    }
  }

  axis.width = function(width) {
    if (horizontal_) {
      // if horizontal the width is usually given; this defines the range of
      // the scale
      if (arguments.length === 0) {
        return width_;
      } else {
        width_ = width;
        scale_.range([0, width_]);
        return this;
      }
    } else {
      // if vertical the width is usually defined by the graph: the space it
      // needs to draw the tickmarks and labels etc. 
      if (arguments.length === 0) {
        //var tick_format = label_size_.format();
        var ticks = scale_.ticks();
        var w = 0;
        for (var i = 0; i < ticks.length; ++i) {
          var lw = label_size_.width(ticks[i]);
          if (lw > w) w = lw;
        }
        width_ = w + settings_.tick_length + settings_.tick_padding + settings_.padding;  
        return width_;
      } else {
        width_ = width;
        return this;
      }
    }
  };

  axis.height = function(height) {
    if (horizontal_) {
      // if horizontal the width is usually defined by the graph: the space it
      // needs to draw the tickmarks and labels etc. 
      if (arguments.length === 0) {
        var tick_format = label_size_.format();
        var ticks = scale_.ticks()
          .map(tick_format);
        var h = 0;
        for (var i = 0; i < ticks.length; ++i) {
          var lh = label_size_.height(ticks[i]);
          if (lh > h) h = lh;
        }
        height_ = h + settings_.tick_length + settings_.tick_padding + settings_.padding; 
        return height_;
      } else {
        height_ = height;
        return this;
      }
    } else {
      // if vertical the width is usually given; this defines the range of
      // the scale
      if (arguments.length === 0) {
        return height_;
      } else {
        height_ = height;
        scale_.range([height_, 0]);
        return this;
      }
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == 'number';
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable_;
    } else {
      variable_ = v;
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return scale_.domain();
    } else {
      var range = d3.extent(data, function(d) { return +d[variable_];});
      var vschema = variable_schema(variable_, schema);
      if (vschema.origin) origin_ = vschema.origin;
      if (origin_ !== undefined) {
        if (range[0] > origin_) range[0] = origin_;
        if (range[1] < origin_) range[1] = origin_;
      }
      scale_.domain(range).nice();
      label_size_.format(variable_value_formatter(variable_, schema));
      return this;
    }
  };

  axis.origin = function(origin) {
    if (arguments.length === 0) {
      return origin_;
    } else {
      origin_ = origin;
      return this;
    }
  };

  axis.ticks = function() {
    return scale_.ticks();
  };

  axis.scale = function(v) {
    if (typeof v == 'object') { 
      return scale_(v[variable_]);
    } else {
      return scale_(v);
    }
  };

  return axis;
}

if (grph.axis === undefined) grph.axis = {};
grph.axis.linear = grph_axis_linear();



function grph_axis_period() {

  var scale_ = grph_scale_period();
  var height_;
  var variable_;
  var settings = {
    "tick_length" : [15, 30, 45],
    "tick-threshold" : 7,
    "label-year-small" : 30,
    "label-threshold" : 15
  };

  // checks if we need/want to draw tickmarks and labels for months and
  // quarters. This depends on the density. When th density becomes too
  // large first no labels are drawn; when higher the ticksmarks are also
  // not drawn.
  function determine_what_to_draw(ticks) {
    // determine if we want to draw ticks and labels for months
    var n = ticks.filter(function(t) {return t.type == "month";}).length;
    var d = (scale_.range()[1] - scale_.range()[0]) / n;
    var month_ticks  = scale_.has_month() && d > settings['tick-threshold'];
    var month_labels = scale_.has_month() && d > settings['label-threshold'];
    // determine if we want to draw ticks and labels for quarters
    n = ticks.filter(function(t) {return t.type == "quarter";}).length;
    d = (scale_.range()[1] - scale_.range()[0]) / n;
    var quarter_ticks  = scale_.has_quarter() && d > settings['tick-threshold'];
    var quarter_labels = scale_.has_quarter() && d > settings['label-threshold'];
    // determine if we want to draw all year labels or only the begin and end
    // labels
    n = ticks.filter(function(t) {return t.type == "year";}).length;
    d = (scale_.range()[1] - scale_.range()[0]) / n;
    var year_labels = d > settings['label-threshold'];
    var year_small = d < settings['label-year-small'];
    return {
      month : {ticks : month_ticks, labels : month_labels},
      quarter : {ticks : quarter_ticks, labels : quarter_labels},
      year : {ticks: true, labels : year_labels, small: year_small}
    };
  }

  var axis = function(g) {
    var ticks = scale_.ticks();

    var to_draw = determine_what_to_draw(ticks);

    var tick_length = {};
    var tick = 0;
    if (to_draw.month.ticks) tick_length.month = settings.tick_length[tick++];
    if (to_draw.quarter.ticks) tick_length.quarter = settings.tick_length[tick++];
    tick_length.year = settings.tick_length[tick++];

    // draw the tick marks
    // remove tickmarks that do not need to be drawn
    ticks = ticks.filter(function(d) {
      if (d.type == 'quarter' && !to_draw.quarter.ticks) return false;
      if (d.type == 'month' && !to_draw.month.ticks) return false;
      return true;
    });

    g.selectAll("line.tick-end").data(ticks).enter().append("line")
      .attr("class", function(d) {
        var last = d.last ? " ticklast" : "";
        return "tick tickend tick" + d.type + last;
      })
      .attr("x1", function(d) { return scale_(d.period.end);})
      .attr("y1", 0)
      .attr("x2", function(d) { return scale_(d.period.end);})
      .attr("y2", function(d) { return tick_length[d.type];});
    g.selectAll("line.tick-start").data(ticks).enter().append("line")
      .attr("class", function(d) {
        var last = d.last ? " ticklast" : "";
        return "tick tickstart tick" + d.type + last;
      })
      .attr("x1", function(d) { return scale_(d.period.start);})
      .attr("y1", 0)
      .attr("x2", function(d) { return scale_(d.period.start);})
      .attr("y2", function(d) { return tick_length[d.type];});

    // draw the labels
    // remove tickmarks that do not need to be drawn
    console.log(to_draw);
    console.log(ticks);
    var first_year = true;
    ticks = ticks.filter(function(d) {
      if (d.type == 'quarter' && !to_draw.quarter.labels) return false;
      if (d.type == 'month' && !to_draw.month.labels) return false;
      if (d.type == 'year' && !to_draw.year.labels) {
        var first_or_last = d.last || first_year;
        first_year = false;
        if (!first_or_last) return false;
      }
      return true;
    });

    console.log("ticks=", ticks);
    g.selectAll("text").data(ticks).enter().append("text")
      .attr("class", function(d) { return "ticklabel ticklabel" + d.type;})
      .attr("x", function(d) { return scale_(d.date);})
      .attr("y", function(d) { return tick_length[d.type];})
      .attr("text-anchor", "middle")
      .text(function(d) {
        if (d.type == "month") {
          return d.period.start.format("MMM").charAt(0);
        } else if (d.type == "quarter") {
          return "Q" + d.period.start.format("Q");
        } if (d.type == "year" && to_draw.year.small) {
          return (d.label + "").slice(-2);
        }
        return d.label;
      });
  };

  axis.height = function(height_) {
    if (arguments.length === 0) {
      if (height_ === undefined) {
        var tick = 0;
        if (scale_.has_month) tick++;
        if (scale_.has_quarter) tick++;
        return settings.tick_length[tick];
      } else {
        return height_;
      }
    } else {
      height_ = height;
      return this;
    }
  };

  axis.width = function(width) {
    if (arguments.length === 0) {
      var r = scale_.range();
      return r[1] - r[0];
    } else {
      scale_.range([0, width]);
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == 'date' || vschema.type == 'period';
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable_;
    } else {
      variable_ = v;
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return scale_.domain();
    } else {
      var domain = data.map(function(d) { return d[variable_];});
      scale_.domain(domain);
      return this;
    }
  };


  axis.ticks = function() {
    var ticks = scale_.ticks();
    return ticks.filter(function(d) { return d.type == "year";});
  };

  axis.scale = function(v) {
    if (typeof v == 'object') {
      if (v.hasOwnProperty("date") && v.hasOwnProperty("period")) {
        return scale_(v);
      } else {
        return scale_(v[variable_]);
      }
    } else {
      return scale_(v);
    }
  };


  return axis;
}

if (grph.axis === undefined) grph.axis = {};
grph.axis.period = grph_axis_period();


function grph_axis_region() {

  var variable_;
  var width_, height_;
  var map_loaded_;
  var map_;
  var index_ = {};

  function axis(g) {
  }

  axis.width = function(width) {
    if (arguments.length === 0) {
      return width_;
    } else {
      update_projection_ = update_projection_ || width_ != width;
      width_ = width;
      return this;
    }
  };

  axis.height = function(height) {
    if (arguments.length === 0) {
      return height_;
    } else {
      update_projection_ = update_projection_ || height_ != height;
      height_ = height;
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == 'string';
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable_;
    } else {
      variable_ = v;
      return this;
    }
  };

  // Variable and function that keeps track of whether or not the map has 
  // finished loading. The method domain() loads the map. However, this happens
  // asynchronously. Therefore, it is possible (and often happens) that the map
  // has not yet loaded when scale() and transform() are called. The code 
  // calling these methods therefore needs to wait until the map has loaded. 
  var map_loading_ = false; 
  axis.map_loaded = function() {
    return !map_loading_;
  };

  function load_map(data, schema, callback) {
    if (variable_ === undefined) return ; // TODO
    var vschema = variable_schema(variable_, schema);
    if (vschema.map === undefined) return ; // TODO
    if (vschema.map == map_loaded_) return; 
    map_loading_ = true;
    // TODO handle errors in d3.json
    d3.json(vschema.map, function(json) {
      map_loaded_ = vschema.map;
      callback(json);
      map_loading_ = false;
    });
  }

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      //return scale.domain();
    } else {
      load_map(data, schema, function(map) {
        map_ = map;
        update_projection_ = true;
        // build index mapping region name on features 
        var vschema = variable_schema(variable_, schema);
        var regionid = vschema.regionid || "id";
        for (var feature in map_.features) {
          var name = map_.features[feature].properties[regionid];
          index_[name] = feature;
        }
      });
      return this;
    }
  };

  axis.scale = function(v) {
    if (typeof v == 'object') { 
      return axis.scale(v[variable_]);
    } else {
      axis.update_projection();
      return path_(map_.features[index_[v]]);
    }
  };

  // The projection. Calculating the scale and translation of the projection 
  // takes time. Therefore, we only want to do that when necessary. 
  // update_projection_ keeps track of whether or not the projection needs 
  // recalculation
  var update_projection_ = true;
  // the projection
  var projection_ = d3.geo.transverseMercator()
    .rotate([-5.38720621, -52.15517440]).scale(1).translate([0,0]);
  var path_ = d3.geo.path().projection(projection_);
  // function that recalculates the scale and translation of the projection
  axis.update_projection = function() {
    if (update_projection_ && map_) {
      projection_.scale(1).translate([0,0]);
      path_ = d3.geo.path().projection(projection_);
      var bounds = path_.bounds(map_);
      var scale  = 0.95 / Math.max((bounds[1][0] - bounds[0][0]) / width_, 
                  (bounds[1][1] - bounds[0][1]) / height_);
      var transl = [(width_ - scale * (bounds[1][0] + bounds[0][0])) / 2, 
                  (height_ - scale * (bounds[1][1] + bounds[0][1])) / 2];
      projection_.scale(scale).translate(transl);
      update_projection_ = false;
    }
  };


  return axis;
}

// A function expecting two functions. The second function is called when the 
// first function returns true. When the first function does not return true
// we wait for 100ms and try again. 
var wait_for = function(m, f) {
  if (m()) {
    f();
  } else {
    setTimeout(function() { wait_for(m, f);}, 100);
  }
};

if (grph.axis === undefined) grph.axis = {};
grph.axis.linear = grph_axis_linear();



function grph_axis_size() {

  var variable_;
  var width, height;
  var scale = grph_scale_size();

  function axis(g) {
  }

  axis.width = function(w) {
    if (arguments.length === 0) {
      return width;
    } else {
      width = w;
      return this;
    }
  };

  axis.height = function(h) {
    if (arguments.length === 0) {
      return height;
    } else {
      height = h;
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == 'number';
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable;
    } else {
      variable = v;
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return scale.domain();
    } else {
      if (variable === undefined) return this;
      scale.domain(d3.extent(data, function(d) { return d[variable];}));
      return this;
    }
  };

  axis.ticks = function() {
    return scale.ticks();
  };

  axis.scale = function(v) {
    if (typeof v == 'object') { 
      return axis.scale(v[variable]);
    } else {
      return scale(v);
    }
  };

  return axis;
}

if (grph.axis === undefined) grph.axis = {};
grph.axis.size = grph_axis_size();



function grph_axis_split() {

  var variable_;
  var width_, height_;
  var domain_;
  var ticks_;
  var settings_ = {
  };

  function axis(g) {
  }

  axis.width = function(width) {
    if (arguments.length === 0) {
      return width_;
    } else {
      width_ = width;
      return this;
    }
  };

  axis.height = function(height) {
    if (arguments.length === 0) {
      return height_;
    } else {
      height_ = height;
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    var vschema = variable_schema(variable, schema);
    return vschema.type == "categorical" || vschema.type == "period";
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return variable_;
    } else {
      variable_ = v;
      return this;
    }
  };
 
  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return domain_;
    } else {
      if (variable_ === undefined) return this;
      var vschema = variable_schema(variable_, schema);
      var categories = [];
      if (vschema.type == "categorical") {
        categories = vschema.categories.map(function(d) { return d.name; });
      } else {
        var vals = data.map(function(d) { return d[variable_];}).sort();
        var prev;
        for (var i = 0; i < vals.length; ++i) {
          if (vals[i] != prev) categories.push("" + vals[i]);
          prev = vals[i];
        }
      }
      domain_ = categories;
      var format = variable_value_formatter(variable_, schema);
      ticks_ = domain_.map(format);
      return this;
    }
  };

  axis.ticks = function() {
    return ticks_;
  };

  axis.scale = function(v) {
    return domain_.indexOf(v);
  };

  return axis;
}


function grph_axis_switch(axes) {

  var type = 0;

  var axis = function(g) {
    return axes[type](g);
  };

  axis.height = function(height_) {
    if (arguments.length === 0) {
      return axes[type].height();
    } else {
      for (var i=0; i<axes.length; ++i) axes[i].height(height_);
      return this;
    }
  };

  axis.width = function(width) {
    if (arguments.length === 0) {
      return axes[type].width();
    } else {
      for (var i=0; i<axes.length; ++i) axes[i].width(width);
      return this;
    }
  };

  axis.accept = function(variable, schema) {
    for (var i=0; i<axes.length; ++i) {
      if (axes[i].accept(variable, schema))
        return true;
    }
    return false;
  };

  axis.variable = function(v) {
    if (arguments.length === 0) {
      return axes[type].variable();
    } else {
      for (var i=0; i<axes.length; ++i) axes[i].variable(v);
      return this;
    }
  };

  axis.domain = function(data, schema) {
    if (arguments.length === 0) {
      return axes[type].variable();
    } else {
      var variable = axis.variable();
      for (var i=0; i<axes.length; ++i) {
        if (axes[i].accept(variable, schema)) {
          type = i;
          break;
        }
      }
      axes[type].domain(data, schema);
      return this;
    }
  };


  axis.ticks = function() {
    return axes[type].ticks();
  };

  axis.scale = function(v) {
    return axes[type].scale(v);
  };

  return axis;
}


function variable_schema(variable, schema) {
  for (var i = 0; i < schema.fields.length; i++) {
    if (schema.fields[i].name == variable) 
      return schema.fields[i];
  }
  return undefined;
}

function variable_value_formatter(variable, schema){
  for (var i = 0; i < schema.fields.length; i++){
    var field = schema.fields[i];
      if (field.name == variable){
      switch(field.type){
        case "number":{
          return number_formatter(field);
        }
        case "categorical":{
          return categorical_formatter(field);
        }
        case "string":{
          return categorical_formatter(field);
        }        
        default:{
          return default_formatter(field);
        }
      }
      }
  }
  return default_formatter();
}
// creates a formatter for pretty printing values for a specific field 
function value_formatter(schema){
  var formatters = {};
  for (var i = 0; i < schema.fields.length; i++){
    var field = schema.fields[i];
    switch(field.type){
      case "number":{
        formatters[field.name] = number_formatter(field);
        break;
      }
      case "categorical":{
        formatters[field.name] = categorical_formatter(field);
        break;
      }
      case "string":{
        formatters[field.name] = categorical_formatter(field);
        break;
      }
      default:{
        formatters[field.name] = default_formatter(field);
      }
    }
  }

  return function(datum, name){
    return formatters[name](datum[name]);
  };
}

function default_formatter(field){
  return function(value){
    return value;
  };
}

function categorical_formatter(field){
  var cat_titles = {};
  for (var i = 0; i < field.categories.length; i++){
    var cat = field.categories[i];
    cat_titles[cat.name] = cat.title || cat.name;
  }
  return function(value){
    return cat_titles[value] || "(" + value + ")";
  };
}

FACTOR = /x ?(\d ?\d*)(.*)/;

function number_formatter(field){
  //TODO use rounding?
  var unit = field.unit || "";
  var factor = 1;
  
  if (FACTOR.test(unit)){
    var m = FACTOR.exec(unit);
    factor = parseInt(m[1].replace(" ", ""));
    unit = m[2].trimLeft();
  }

  if (unit == "%"){
    return function(value){
      return (factor*value).toLocaleString() + "%";    
    };
  }

  var in_euro = /\s?\beuro$/; 
  if (in_euro.test(unit)){
    unit = unit.replace(in_euro, "");
    if (unit.length) {
      unit = " " + unit;
    }
    return function(value) {
      return "€ " + (factor*value).toLocaleString() + unit;
    };
  }

  return function(value){
    return (factor*value).toLocaleString() + " " + unit;
  };
}



function date_period(str) {

  function is_year(period) {
    // starting month should be 0
    if (period.start.month() !== 0) return false;
    // starting day of month should be 1
    if (period.start.date() != 1) return false;
    // length should be 1 year
    return period.length("years") == 1;
  }
  function is_quarter(period) {
    // starting month should be 0, 3, 6, or 9
    if ((period.start.month() % 3) !== 0) return false;
    // starting day of month should be 1
    if (period.start.date() != 1) return false;
    // length should be 3 months
    return period.length("months") == 3;
  }
  function is_month(period) {
    // starting day of month should be 1
    if (period.start.date() != 1) return false;
    // length should be 1 months
    return period.length("months") == 1;
  }

  var basic_year_regexp = /^(\d{4})$/;
  var basic_month_regexp = /^(\d{4})[Mm-]{1}(\d{1,2})$/;
  var basic_quarter_regexp = /^(\d{4})[Qq]{1}(\d{1,2})$/;

  var t0, dt, p, t, year;
  if (basic_year_regexp.test(str)) {
    str = basic_year_regexp.exec(str);
    year = +str[1];
    t0 = moment.utc([+str[1]]);
    dt = moment.duration(1, "year");
    p  = dt.afterMoment(t0);
    t  = t0.add(moment.duration(p.length()/2));
    return {type: "year", date: t, period: p};
  } else if (basic_month_regexp.test(str)) {
    str = basic_month_regexp.exec(str);
    t0 = moment.utc([+str[1], +str[2]-1]);
    dt = moment.duration(1, "month");
    p  = dt.afterMoment(t0);
    t  = t0.add(moment.duration(p.length()/2));
    return {type: "month", date: t, period: p};
  } else if (basic_quarter_regexp.test(str)) {
    str = basic_quarter_regexp.exec(str);
    year    = +str[1];
    var quarter = +str[2];
    t0 = moment.utc([+str[1], (+str[2]-1)*3]);
    dt = moment.duration(3, "month");
    p  = dt.afterMoment(t0);
    t  = t0.add(moment.duration(p.length()/2));
    return {type: "quarter", date: t, period: p};
  } else if (typeof(str) == "string") {
    str = str.split("/");
    t0   = moment.utc(str[0], moment.ISO_8601);
    if (str.length == 1) {
      dt = moment.duration(0);
      return {type: "date", date: t0, period: dt.afterMoment(t0)};
    } else {
      dt = moment.duration(str[1]);
      p  = dt.afterMoment(t0);
      t  = t0.add(moment.duration(p.length()/2));
      var type = "period";
      if (is_year(p)) {
        type = "year";
      } else if (is_quarter(p)) {
        type = "quarter";
      } else if (is_month(p)) {
        type = "month";
      }
      return {type: type, date: t, period: p};
    }
  } else {
    t0   = moment.utc(str);
    dt = moment.duration(0);
    return {type: "date", date: t0, period: dt.afterMoment(t0)};
  }
}


function grph_generic_graph(axes, dispatch, type, graph_panel) {

  var dummy_ = d3.select("body").append("svg")
    .attr("class", "dummy graph graph-" + type)
    .attr("width", 0).attr("height", 0)
    .style("visibility", "hidden");
  var label_size_ = grph_label_size(dummy_);


  var graph = grph_graph(axes, dispatch, function(g) {
    function nest_column(d) {
      return axes.column.variable() ? d[axes.column.variable()] : 1;
    }
    function nest_row(d) {
      return axes.row.variable() ? d[axes.row.variable()] : 1;
    }
    // setup axes
    for (var axis in axes) axes[axis].domain(graph.data(), graph.schema());
    // determine number of rows and columns
    var ncol = axes.column.variable() ? axes.column.ticks().length : 1;
    var nrow = axes.row.variable() ? axes.row.ticks().length : 1;
    // get labels and determine their height
    var vschemax = variable_schema(axes.x.variable(), graph.schema());
    var xlabel = vschemax.title;
    var label_height = label_size_.height(xlabel) + settings('label_padding');
    var vschemay = variable_schema(axes.y.variable(), graph.schema());
    var ylabel = vschemay.title;
    // set the width, height end domain of the x- and y-axes. We need some 
    // iterations for this, as the height of the y-axis depends of the height
    // of the x-axis, which depends on the labels of the x-axis, which depends
    // on the width of the x-axis, etc. 
    var rowlabel_width = axes.row.variable() ? 3*label_height : 0;
    var columnlabel_height = axes.column.variable() ? 3*label_height : 0;
    var w, h;
    for (var i = 0; i < 2; ++i) {
      w = graph.width() - settings('padding')[1] - settings('padding')[3] - 
        axes.y.width() - label_height - rowlabel_width;
      w = (w - (ncol-1)*settings('sep')) / ncol;
      axes.x.width(w).domain(graph.data(), graph.schema());
      h = graph.height() - settings('padding')[0] - settings('padding')[2] - 
        axes.x.height() - label_height - columnlabel_height;
      h = (h - (nrow-1)*settings('sep')) / nrow;
      axes.y.height(h).domain(graph.data(), graph.schema());
    }
    var l = axes.y.width() + settings('padding')[1] + label_height;
    var t  = settings('padding')[2] + columnlabel_height;
    // create group containing complete graph
    g = g.append("g").attr("class", "graph graph-" + type);
    // draw labels
    var ycenter = t + 0.5*(graph.height() - settings('padding')[0] - settings('padding')[2] - 
        axes.x.height() - label_height);
    var xcenter = l + 0.5*(graph.width() - settings('padding')[1] - settings('padding')[3] - 
        axes.y.width() - label_height);
    g.append("text").attr("class", "label label-y")
      .attr("x", settings('padding')[1]).attr("y", ycenter)
      .attr("text-anchor", "middle").text(ylabel)
      .attr("transform", "rotate(90 " + settings('padding')[1] + " " + ycenter + ")");
    g.append("text").attr("class", "label label-x")
      .attr("x", xcenter).attr("y", graph.height()-settings('padding')[0])
      .attr("text-anchor", "middle").text(xlabel);
    if (axes.row.variable()) {
      var xrow = graph.width() - settings('padding')[3] - label_height;
      var vschemarow = variable_schema(axes.row.variable(), graph.schema());
      var rowlabel = vschemarow.title;
      g.append("text").attr("class", "label label-y")
        .attr("x", xrow).attr("y", ycenter)
        .attr("text-anchor", "middle").text(rowlabel)
        .attr("transform", "rotate(90 " + xrow + " " + ycenter + ")");
    }
    if (axes.column.variable()) {
      var vschemacolumn = variable_schema(axes.column.variable(), graph.schema());
      var columnlabel = vschemacolumn.title;
      g.append("text").attr("class", "label label-y")
        .attr("x", xcenter).attr("y", settings("padding")[2]).attr("dy", "0.71em")
        .attr("text-anchor", "middle").text(columnlabel);
    }
    // create each of the panels
    var d = d3.nest().key(nest_column).key(nest_row).entries(graph.data());
    for (i = 0; i < d.length; ++i) {
      var dj = d[i].values;
      t  = settings('padding')[2] + columnlabel_height;
      for (var j = 0; j < dj.length; ++j) {
        // draw x-axis
        if (j == (dj.length-1)) {
          g.append("g").attr("class", "axis axis-x")
            .attr("transform", "translate(" + l + "," + (t + h) + ")").call(axes.x);
        }
        // draw y-axis
        if (i === 0) {
          g.append("g").attr("class", "axis axis-y")
            .attr("transform", "translate(" + (l - axes.y.width()) + "," + t + ")")
            .call(axes.y);
        }
        // draw row labels
        if (i == (d.length-1) && axes.row.variable()) {
          var rowtick = axes.row.ticks()[j];
          var grow = g.append("g").attr("class", "axis axis-row")
            .attr("transform", "translate(" + (l + w) + "," + t + ")");
          grow.append("rect").attr("class", "background")
            .attr("width", label_height + 2*settings("tick_padding"))
            .attr("height", h);
          grow.append("text").attr("class", "ticklabel")
            .attr("x", 0).attr("y", h/2)
            .attr("transform", "rotate(90 " + 
              (label_height - settings("tick_padding")) + " " + h/2 + ")")
            .attr("text-anchor", "middle").attr("dy", "0.35em")
            .text(rowtick);
        }
        // draw column labels
        if (j === 0 && axes.column.variable()) {
          var columntick = axes.column.ticks()[i];
          var coltickh = label_height + 2*settings("tick_padding");
          var gcolumn = g.append("g").attr("class", "axis axis-column")
            .attr("transform", "translate(" + l + "," + (t - coltickh) + ")");
          gcolumn.append("rect").attr("class", "background")
            .attr("width", w)
            .attr("height", label_height + 2*settings("tick_padding"));
          gcolumn.append("text").attr("class", "ticklabel")
            .attr("x", w/2).attr("y", settings("tick_padding"))
            .attr("text-anchor", "middle").attr("dy", "0.71em")
            .text(columntick);
        }
        // draw box for graph
        var gr = g.append("g").attr("class", "panel")
          .attr("transform", "translate(" + l + "," + t + ")");
        gr.append("rect").attr("class", "background")
          .attr("width", w).attr("height", h);
        // draw grid
        var xticks = axes.x.ticks();
        gr.selectAll("line.gridx").data(xticks).enter().append("line")
          .attr("class", "grid gridx")
          .attr("x1", axes.x.scale).attr("x2", axes.x.scale)
          .attr("y1", 0).attr("y2", h);
        var yticks = axes.y.ticks();
        gr.selectAll("line.gridy").data(yticks).enter().append("line")
          .attr("class", "grid gridy")
          .attr("x1", 0).attr("x2", w)
          .attr("y1", axes.y.scale).attr("y2", axes.y.scale);
        // add crosshairs to graph
        var gcrossh = gr.append("g").classed("crosshairs", true);
        gcrossh.append("line").classed("hline", true).attr("x1", 0)
          .attr("y1", 0).attr("x2", axes.x.width()).attr("y2", 0)
          .style("visibility", "hidden");
        gcrossh.append("line").classed("vline", true).attr("x1", 0)
          .attr("y1", 0).attr("x2", 0).attr("y2", axes.y.height())
          .style("visibility", "hidden");
        // draw panel
        graph_panel(gr, dj[j].values);
        // next panel
        t += axes.y.height() + settings('sep');
      }
      l += axes.x.width() + settings('sep');
    }
    // finished drawing call ready event
    dispatch.ready.call(g);
  });

  return graph;
}


function grph_graph(axes, dispatch, graph) {

  var width, height;
  var data, schema;

  graph.axes = function() {
    return d3.keys(axes);
  };

  graph.width = function(w) {
    if (arguments.length === 0) {
      return width;
    } else {
      width = w;
      return this;
    }
  };

  graph.height = function(h) {
    if (arguments.length === 0) {
      return height;
    } else {
      height = h;
      return this;
    }
  };

  graph.accept = function(variables, axis) {
    if (arguments.length > 1) {
      if (axes[axis] === undefined) return false;
      return axes[axis].accept(variables, schema);
    } else {
      for (var i in axes) {
        if (variables[i] === undefined) {
          if (axes[i].required) return false;
        } else {
          var accept = axes[i].accept(variables[i], schema);
          if (!accept) return false;
        }
      }
      return true;
    }
  };

  graph.assign = function(variables) {
    for (var i in axes) axes[i].variable(variables[i]);
    return this;
  };

  graph.schema = function(s) {
    if (arguments.length === 0) {
      return schema;
    } else {
      schema = s;
      return this;
    }
  };

  graph.data = function(d, s) {
    if (arguments.length === 0) {
      return data;
    } else {
      data = d;
      if (arguments.length > 1) 
        graph.schema(s);
      return this;
    }
  };

  graph.dispatch = function() {
    return dispatch;
  };

  return graph;
}



function grph_graph_bar() {

  var axes = {
    'x' : grph_axis_linear(true).origin(0),
    'y' : grph_axis_categorical(),
    'colour': grph_axis_colour(),
    'column' : grph_axis_split(),
    'row' : grph_axis_split()
  };
  axes.x.required = true;
  axes.y.required = true;
  var dispatch = d3.dispatch("mouseover", "mouseout", "click", "ready");

  var graph = grph_generic_graph(axes, dispatch, "bar", function(g, data) {
    function nest_colour(d) {
      return axes.colour.variable() ? d[axes.colour.variable()] : 1;
    }
    function get_x(d) {
      var v = axes.x.scale(d);
      return v < axes.x.scale(origin) ? v : axes.x.scale(origin);
    }
    function get_width(d) {
      return Math.abs(axes.x.scale(d) - axes.x.scale(origin));
    }
    function get_y(d) {
      return axes.y.scale.l(d) + i*axes.y.scale.w(d)/ncolours;
    }
    function get_height(d) {
      return axes.y.scale.w(d)/ncolours;
    }

    var d = d3.nest().key(nest_colour).entries(data);
    var ncolours = d.length;
    var origin = axes.x.origin();
    for (var i = 0; i < d.length; ++i) {
      var colour = axes.colour.scale(d[i].key);
      g.selectAll("rect." + colour).data(d[i].values).enter().append("rect")
        .attr("class", "bar " + colour).attr("x", get_x)
        .attr("width", get_width).attr("y", get_y).attr("height", get_height);
    }
    g.append("line").attr("class", "origin")
      .attr("x1", axes.x.scale(origin))
      .attr("x2", axes.x.scale(origin))
      .attr("y1", 0).attr("y2", axes.y.height());
  });

  // when finished drawing graph; add event handlers 
  dispatch.on("ready", function() {
    // add hover events to the lines and points
    var self = this;
    this.selectAll(".colour").on("mouseover", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseover.call(self, variable, value, d);
    }).on("mouseout", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseout.call(self, variable, value, d);
    }).on("click", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.click.call(self, variable, value, d);
    });
  });

  // Local event handlers
  dispatch.on("mouseover", function(variable, value, d) {
    if (variable) {
      var classes = axes.colour.scale("" + value);
      var regexp = /\bcolour([0-9]+)\b/;
      var colour = regexp.exec(classes)[0];
      this.selectAll(".colour").classed("colourlow", true);
      this.selectAll("." + colour).classed({"colourhigh": true, "colourlow": false});
    }
    this.selectAll(".hline").attr("y1", axes.y.scale(d)).attr("y2", axes.y.scale(d))
      .style("visibility", "visible");
    this.selectAll(".vline").attr("x1", axes.x.scale(d)).attr("x2", axes.x.scale(d))
      .style("visibility", "visible");
  });
  dispatch.on("mouseout", function(variable, value, d) {
    this.selectAll(".colour").classed({"colourhigh": false, "colourlow": false});
    this.selectAll(".hline").style("visibility", "hidden");
    this.selectAll(".vline").style("visibility", "hidden");
  });

  // Tooltip
  // when d3.tip is loaded
  if (d3.tip !== undefined) {
    var tip = d3.tip().direction("se").attr('class', 'tip tip-bar').html(function(variable, value, d) { 
      var schema = graph.schema();
      var format = value_formatter(schema);
      var str = '';
      for (var i in schema.fields) {
        var field = schema.fields[i];
        str += field.title + ': ' + format(d, field.name) + '</br>';
      }
      return str;
    });
    dispatch.on("ready.tip", function() {
      this.call(tip);
    });
    dispatch.on("mouseover.tip", function(variable, value, d) {
      tip.show(variable, value, d);
    });
    dispatch.on("mouseout.tip", function(variable, value, d) {
      tip.hide(variable, value, d);
    });
  }

  return graph;
}


function grph_graph_bubble() {

  var axes = {
    'x' : grph_axis_linear(true),
    'y' : grph_axis_linear(false),
    'object' : grph_axis_colour(),
    'size'   : grph_axis_size(),
    'colour' : grph_axis_colour(),
    'column' : grph_axis_split(),
    'row' : grph_axis_split()
  };
  axes.x.required = true;
  axes.y.required = true;
  axes.object.required = true;
  var dispatch = d3.dispatch("mouseover", "mouseout", "click", "ready");

  var graph = grph_generic_graph(axes, dispatch, "bubble", function(g, data) {
    function nest_object(d) {
      return axes.object.variable() ? d[axes.object.variable()] : 1;
    }
    function nest_colour(d) {
      return axes.colour.variable() ? d[axes.colour.variable()] : 1;
    }
    var d = d3.nest().key(nest_colour).entries(data);
    // draw bubbles 
    for (var i = 0; i < d.length; ++i) {
      g.selectAll("circle.bubble" + i).data(d[i].values).enter().append("circle")
        .attr("class", "bubble bubble" + i + " " + axes.colour.scale(d[i].key))
        .attr("cx", axes.x.scale).attr("cy", axes.y.scale)
        .attr("r", axes.size.scale);
    }
    // draw lines
    g.selectAll("g.line").data(lines).enter().append("g").attr("class", "line")
      .each(function(d) { d.draw(this, d, axes);});
  });


  // when finished drawing graph; add event handlers 
  dispatch.on("ready", function() {
    // add hover events to the lines and points
    var self = this;
    this.selectAll(".colour").on("mouseover", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseover.call(self, variable, value, d);
    }).on("mouseout", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseout.call(self, variable, value, d);
    }).on("click", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.click.call(self, variable, value, d);
    });
  });

  // Local event handlers
  dispatch.on("mouseover", function(variable, value, d) {
    if (variable) {
      var classes = axes.colour.scale("" + value);
      var regexp = /\bcolour([0-9]+)\b/;
      var colour = regexp.exec(classes)[0];
      this.selectAll(".colour").classed("colourlow", true);
      this.selectAll("." + colour).classed({"colourhigh": true, "colourlow": false});
    }
    this.selectAll(".hline").attr("y1", axes.y.scale(d)).attr("y2", axes.y.scale(d))
      .style("visibility", "visible");
    this.selectAll(".vline").attr("x1", axes.x.scale(d)).attr("x2", axes.x.scale(d))
      .style("visibility", "visible");
  });
  dispatch.on("mouseout", function(variable, value, d) {
    this.selectAll(".colour").classed({"colourhigh": false, "colourlow": false});
    this.selectAll(".hline").style("visibility", "hidden");
    this.selectAll(".vline").style("visibility", "hidden");
  });

  // Tooltip
  // when d3.tip is loaded
  if (d3.tip !== undefined) {
    var tip = d3.tip().direction("se").attr('class', 'tip tip-bubble').html(function(variable, value, d) { 
      var schema = graph.schema();
      var format = value_formatter(schema);
      var str = '';
      for (var i in schema.fields) {
        var field = schema.fields[i];
        str += field.title + ': ' + format(d, field.name) + '</br>';
      }
      return str;
    });
    dispatch.on("ready.tip", function() {
      this.call(tip);
    });
    dispatch.on("mouseover.tip", function(variable, value, d) {
      tip.show(variable, value, d);
    });
    dispatch.on("mouseout.tip", function(variable, value, d) {
      tip.hide(variable, value, d);
    });
  }

  
  var lines = [];
  graph.add_hline = function(h, classname) {
    function draw_hline(g, data, axes) {
      var xmin = axes.x.scale(axes.x.domain()[0]);
      var xmax = axes.x.scale(axes.x.domain()[1]);
      d3.select(g).append("line")
        .attr("x1", xmin).attr("x2", xmax)
        .attr("y1", axes.y.scale(data.h))
        .attr("y2", axes.y.scale(data.h))
        .attr("class", data['class']);
    }
    lines.push({draw : draw_hline, h : h, 'class' : classname});
    return this;
  };
  graph.add_abline = function(a, b, classname) {
    function draw_hline(g, data, axes) {
      var domain = axes.x.domain();
      d3.select(g).append("line")
        .attr("x1", axes.x.scale(domain[0]))
        .attr("x2", axes.x.scale(domain[1]))
        .attr("y1", axes.y.scale(a + b * domain[0]))
        .attr("y2", axes.y.scale(a + b * domain[1]))
        .attr("class", data['class']);
    }
    lines.push({draw : draw_hline, a : a, b: b, 'class' : classname});
    return this;
  };


  return graph;
}



function grph_graph_line() {

  var axes = {
    'x' : grph_axis_switch([grph_axis_linear(true), grph_axis_period()]),
    'y' : grph_axis_linear(false),
    'colour' : grph_axis_colour(),
    'column' : grph_axis_split(),
    'row' : grph_axis_split()
  };
  axes.x.required = true;
  axes.y.required = true;
  var dispatch = d3.dispatch("mouseover", "mouseout", "pointover", "pointout",
    "click", "ready");

  var point_size = settings('point_size');

  var graph = grph_generic_graph(axes, dispatch, "line", function(g, data) {
    function nest_colour(d) {
      return axes.colour.variable() ? d[axes.colour.variable()] : 1;
    }
    point_size = settings('point_size');

    var d = d3.nest().key(nest_colour).entries(data);
    // draw lines 
    var y_var = axes.y.variable();
    var line = d3.svg.line().x(axes.x.scale).y(axes.y.scale);
    
    var not_empty = function(d){
      return (d[y_var] !== null && isFinite(d[y_var]));
    };

    line.defined(not_empty);

    for (var i = 0; i < d.length; ++i) {
      g.append("path").attr("d", line(d[i].values))
        .attr("class", axes.colour.scale(d[i].key))
        .datum(d[i]);
    }

    // draw points 
    if (d.length > 0){
      var N = d[0].values.length;
      point_size = Math.min(point_size, (axes.x.width()) / (3*N));
      point_size = Math.max(0, point_size);
      console.log("point size", point_size);
    }
    //point_size = 1;
    for (i = 0; i < d.length; ++i) {
      var cls = "circle" + i;
      g.selectAll("circle.circle" + i).data(d[i].values.filter(not_empty))
       .enter()
        .append("circle")
         .attr("class", "circle" + i + " " + axes.colour.scale(d[i].key))
         .attr("cx", axes.x.scale).attr("cy", axes.y.scale)
         .attr("r", point_size);
    }
  });

  // when finished drawing graph; add event handlers 
  dispatch.on("ready", function() {
    // add hover events to the lines and points
    var self = this;
    this.selectAll(".colour").on("mouseover", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseover.call(self, variable, value, d);
      if (!d.key) dispatch.pointover.call(self, variable, value, d, d3.select(this));
    }).on("mouseout", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseout.call(self, variable, value, d);
      if (!d.key) dispatch.pointout.call(self, variable, value, d, d3.select(this));
    }).on("click", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.click.call(self, variable, value, d);
    });
  });
  // Local event handlers
  // Highlighting of selected line
  dispatch.on("mouseover", function(variable, value, d) {
    if (variable) {
      var classes = axes.colour.scale("" + value);
      var regexp = /\bcolour([0-9]+)\b/;
      var colour = regexp.exec(classes)[0];
      this.selectAll(".colour").classed("colourlow", true);
      this.selectAll("." + colour).classed({"colourhigh": true, "colourlow": false});
    }
  });
  dispatch.on("mouseout", function(variable, value, d) {
    this.selectAll(".colour").classed({"colourhigh": false, "colourlow": false});
  });

  // Show crosshairs when hovering over a point
  dispatch.on("pointover", function(variable, value, d, point) {
    this.selectAll(".hline").attr("y1", axes.y.scale(d)).attr("y2", axes.y.scale(d))
      .style("visibility", "visible");
    this.selectAll(".vline").attr("x1", axes.x.scale(d)).attr("x2", axes.x.scale(d))
      .style("visibility", "visible");
    point.attr("r", 1); 
  
  });
  dispatch.on("pointout", function(variable, value, d, point) {
    this.selectAll(".hline").style("visibility", "hidden");
    this.selectAll(".vline").style("visibility", "hidden");
    point.attr("r", point_size);
  });

  // Tooltip
  // when d3.tip is loaded
  if (d3.tip !== undefined) {
    var tip = d3.tip().direction("se").attr('class', 'tip tip-line').html(function(variable, value, d) { 
      var schema = graph.schema();
      var format = value_formatter(schema);
      var str = '';
      for (var i in schema.fields) {
        var field = schema.fields[i];
        str += field.title + ': ' + format(d,field.name) + '</br>';
      }
      return str;
    });
    dispatch.on("ready.tip", function() {
      this.call(tip);
    });
    dispatch.on("pointover.tip", function(variable, value, d) {
      tip.show(variable, value, d);
    });
    dispatch.on("pointout.tip", function(variable, value, d) {
      tip.hide(variable, value, d);
    });
  }

  return graph;
}




function grph_graph_map() {

  var axes = {
    'region' : grph_axis_region(),
    'colour' : grph_axis_chloropleth(),
    'column' : grph_axis_split(),
    'row' : grph_axis_split()
  };
  axes.region.required = true;
  axes.colour.required = true;
  var dispatch = d3.dispatch("ready", "mouseover", "mouseout", "click");

  var dummy_ = d3.select("body").append("svg")
    .attr("class", "dummy graph graph-map")
    .attr("width", 0).attr("height", 0)
    .style("visibility", "hidden");
  var label_size_ = grph_label_size(dummy_);


  var graph = grph_graph(axes, dispatch, function(g) {
    function nest_column(d) {
      return axes.column.variable() ? d[axes.column.variable()] : 1;
    }
    function nest_row(d) {
      return axes.row.variable() ? d[axes.row.variable()] : 1;
    }
    // setup axes
    axes.region.domain(graph.data(), graph.schema());
    axes.colour.domain(graph.data(), graph.schema());
    axes.column.domain(graph.data(), graph.schema());
    axes.row.domain(graph.data(), graph.schema());

    // determine number of rows and columns
    var ncol = axes.column.variable() ? axes.column.ticks().length : 1;
    var nrow = axes.row.variable() ? axes.row.ticks().length : 1;
    // set the width, height end domain of the x- and y-axes
    var label_height = label_size_.height("variable") + settings('label_padding');
    var rowlabel_width = axes.row.variable() ? 3*label_height : 0;
    var columnlabel_height = axes.column.variable() ? 3*label_height : 0;
    var w = (graph.width() - settings("padding", "map")[1] - settings("padding", "map")[3] - 
      rowlabel_width - (ncol-1)*settings("sep", "map"))/ncol;
    var h = (graph.height() - settings("padding", "map")[0] - settings("padding", "map")[2] - 
      columnlabel_height - (nrow-1)*settings("sep", "map"))/nrow;
    var l = settings("padding", "map")[1];
    var t  = settings("padding", "map")[2];
    axes.region.width(w).height(h);
    // create group containing complete graph
    g = g.append("g").attr("class", "graph graph-map");
    // draw labels
    var ycenter = t + 0.5*(graph.height() - settings('padding')[0] - settings('padding')[2] - 
        label_height - columnlabel_height) + columnlabel_height;
    var xcenter = l + 0.5*(graph.width() - settings('padding')[1] - settings('padding')[3] - 
        label_height - rowlabel_width);
    if (axes.row.variable()) {
      var xrow = graph.width() - settings('padding')[3] - label_height;
      var vschemarow = variable_schema(axes.row.variable(), schema);
      var rowlabel = vschemarow.title;
      g.append("text").attr("class", "label label-y")
        .attr("x", xrow).attr("y", ycenter)
        .attr("text-anchor", "middle").text(rowlabel)
        .attr("transform", "rotate(90 " + xrow + " " + ycenter + ")");
    }
    if (axes.column.variable()) {
      var vschemacolumn = variable_schema(axes.column.variable(), schema);
      var columnlabel = vschemacolumn.title;
      g.append("text").attr("class", "label label-y")
        .attr("x", xcenter).attr("y", settings("padding")[2]).attr("dy", "0.71em")
        .attr("text-anchor", "middle").text(columnlabel);
    }
    // draw graphs
    wait_for(axes.region.map_loaded, function() {
      var d = d3.nest().key(nest_column).key(nest_row).entries(graph.data());
      for (var i = 0; i < d.length; ++i) {
        var dj = d[i].values;
        var t  = settings("padding", "map")[2] + columnlabel_height;
        for (var j = 0; j < dj.length; ++j) {
          // draw row labels
          if (i == (d.length-1) && axes.row.variable()) {
            var rowtick = axes.row.ticks()[j];
            var grow = g.append("g").attr("class", "axis axis-row")
              .attr("transform", "translate(" + (l + w) + "," + t + ")");
            grow.append("rect").attr("class", "background")
              .attr("width", label_height + 2*settings("tick_padding"))
              .attr("height", h);
            grow.append("text").attr("class", "ticklabel")
              .attr("x", 0).attr("y", h/2)
              .attr("transform", "rotate(90 " + 
                (label_height - settings("tick_padding")) + " " + h/2 + ")")
              .attr("text-anchor", "middle").attr("dy", "0.35em")
              .text(rowtick);
          }
          // draw column labels
          if (j === 0 && axes.column.variable()) {
            var columntick = axes.column.ticks()[i];
            var coltickh = label_height + 2*settings("tick_padding");
            var gcolumn = g.append("g").attr("class", "axis axis-column")
              .attr("transform", "translate(" + l + "," + (t - coltickh) + ")");
            gcolumn.append("rect").attr("class", "background")
              .attr("width", w)
              .attr("height", label_height + 2*settings("tick_padding"));
            gcolumn.append("text").attr("class", "ticklabel")
              .attr("x", w/2).attr("y", settings("tick_padding"))
              .attr("text-anchor", "middle").attr("dy", "0.71em")
              .text(columntick);
          }
          // draw box for graph
          var gr = g.append("g").attr("class", "map")
            .attr("transform", "translate(" + l + "," + t + ")");
          gr.append("rect").attr("class", "background")
            .attr("width", w).attr("height", h);
          // draw map
          gr.selectAll("path").data(dj[j].values).enter().append("path")
            .attr("d", axes.region.scale).attr("class", axes.colour.scale);
          // next line
          t += h + settings("sep", "map");
        }
        l += w + settings("sep", "map");
      }
      // add events to the lines
      g.selectAll("path").on("mouseover", function(d, i) {
        var region = d[axes.region.variable()];
        dispatch.mouseover.call(g, axes.region.variable(), region, d);
      }).on("mouseout", function(d, i) {
        var region = d[axes.region.variable()];
        dispatch.mouseout.call(g, axes.region.variable(), region, d);
      }).on("click", function(d, i) {
        var region = d[axes.region.variable()];
        dispatch.click.call(g, axes.region.variable(), region, d);
      });
      // finished drawing call ready event
      dispatch.ready.call(g);
    });
  });


  // Local event handlers
  dispatch.on("mouseover.graph", function(variable, value, d) {
    this.selectAll("path").classed("colourlow", true);
    this.selectAll("path").filter(function(d, i) {
      return d[variable] == value;
    }).classed({"colourhigh": true, "colourlow": false});
  });
  dispatch.on("mouseout.graph", function(variable, value, d) {
    this.selectAll("path").classed({"colourhigh": false, "colourlow": false});
  });
  
  // tooltip
  if (d3.tip !== undefined) {
    var tip = d3.tip().direction("se").attr('class', 'tip tip-map').html(function(variable, value, d) { 
      var schema = graph.schema();
      var format = value_formatter(schema);
      var str = '';
      for (var i in schema.fields) {
        var field = schema.fields[i];
        str += field.title + ': ' + format(d, field.name) + '</br>';
      }
      return str;
    });
    dispatch.on("ready.tip", function() {
      this.call(tip);
    });
    dispatch.on("mouseover.tip", function(variable, value, d) {
      tip.show(variable, value, d);
    });
    dispatch.on("mouseout.tip", function(variable, value, d) {
      tip.hide(variable, value, d);
    });
  }

  return graph;
}



function grph_label_size(g) {

  // a svg or g element to which  we will be adding our label in order to
  // request it's size
  var g_ = g;
  var format_ = function(x){return x;};
  // store previously calculated values; as the size of certain labels are 
  // requested again and again this greatly enhances performance
  var sizes_ = {};

  function label_size(label) {
    if (sizes_[label]) {
      return sizes_[label];
    }
    if (!g_) return [undefined, undefined];
    var text = g_.append("text").text(format_(label));
    var bbox = text[0][0].getBBox();
    var size = [bbox.width*1.2, bbox.height*0.65]; // TODO why; and is this always correct
    //var size = horizontal_ ? text[0][0].getComputedTextLength() :
      //text[0][0].getBBox().height;
    text.remove();
    sizes_[label] = size;
    return size;
  }

  label_size.svg = function(g) {
    if (arguments.length === 0) {
      return g_;
    } else {
      g_ = g;
      return this;
    }
  };

  label_size.width = function(label) {
    var size = label_size(label);
    return size[0];
  };

  label_size.height = function(label) {
    var size = label_size(label);
    return size[1];
  };

  label_size.format = function(format){
    if (arguments.length === 0){
      return format_;
    } else {
      format_ = format;
    }
    return this;
  };

  return label_size;
}



function grph_scale_categorical() {

  var domain;
  var range = [0, 1];

  function scale(v) {
    var i = domain.indexOf(v);
    if (i < 0) return {l: undefined, m:undefined, u:undefined};
    var bw = (range[1] - range[0]) / domain.length;
    var m = bw*(i + 0.5);
    var w = bw*(1 - settings("bar_padding"))*0.5;
    return {l:m-w, m:m, u:m+w};
  }

  scale.l = function(v) {
    return scale(v).l;
  };

  scale.m = function(v) {
    return scale(v).m;
  };

  scale.u = function(v) {
    return scale(v).u;
  };

  scale.domain = function(d) {
    if (arguments.length === 0) {
      return domain;
    } else {
      domain = d;
      return this;
    }
  };

  scale.range = function(r) {
    if (arguments.length === 0) {
      return range;
    } else {
      range = r;
      return this;
    }
  };

  scale.ticks = function() {
    return domain;
  };

  return scale;
}

if (grph.scale === undefined) grph.scale = {};
grph.scale.categorical = grph_scale_categorical;



function grph_scale_chloropleth() {

  var domain;
  var baseclass = "chloro";
  var ncolours  = 9;

  function scale(v) {
    if (domain === undefined) {
      // assume we have only 1 colour
      return baseclass + " " + baseclass + "n1" + " " + baseclass + 1;
    }
    var range  = domain[1] - domain[0];
    var val    = Math.sqrt((v - domain[0])*0.9999) / Math.sqrt(range);
    var cat    = Math.floor(val*ncolours);
    // returns something like "chloro chloron10 chloro4"
    return baseclass + " " + baseclass + "n" + ncolours + " " + baseclass + (cat+1);
  }

  scale.domain = function(d) {
    if (arguments.length === 0) {
      return domain;
    } else {
      domain = d;
      return this;
    }
  };

  scale.range = function(r) {
    if (arguments.length === 0) {
      return baseclass;
    } else {
      baseclass = r;
      return this;
    }
  };

  scale.ticks = function() {
    var step = (domain[1] - domain[0])/ncolours;
    var t = domain[0];
    var ticks = [];
    for (var i = 0; i <= ncolours; ++i) {
      ticks.push(t);
      t += step;
    }
    return ticks;
  };

  return scale;
}

if (grph.scale === undefined) grph.scale = {};
grph.scale.chloropleth = grph_scale_chloropleth();



function grph_scale_colour() {

  var domain;
  var range = "colour";
  var ncolours;

  function scale(v) {
    if (domain === undefined) {
      // assume we have only 1 colour
      return range + " " + range + "n1" + " " + range + 1;
    }
    var i = domain.indexOf(v);
    // returns something like "colour colourn10 colour4"
    return range + " " + range + "n" + ncolours + " " + range + (i+1);
  }

  scale.domain = function(d) {
    if (arguments.length === 0) {
      return domain;
    } else {
      domain = d;
      ncolours = d ? d.length: undefined;
      return this;
    }
  };

  scale.range = function(r) {
    if (arguments.length === 0) {
      return range;
    } else {
      range = r;
      return this;
    }
  };

  scale.ticks = function() {
    return domain;
  };

  return scale;
}

if (grph.scale === undefined) grph.scale = {};
grph.scale.colour = grph_scale_colour();


function grph_scale_linear() {

  var lscale = d3.scale.linear();
  var label_size_ = 20;
  var padding_ = 5;
  var nticks_ = 10;
  var ticks_;
  var ndec_;
  var inside_ = true;

  function scale(v) {
    return lscale(v);
  }

  scale.domain = function(d) {
    if (arguments.length === 0) return lscale.domain();
    d = lscale.domain(d);
    ndec_ = undefined;
    ticks_ = undefined;
    return this;
  };

  scale.range = function(r) {
    r = lscale.range(r);
    ndec_ = undefined;
    ticks_ = undefined;
    if (arguments.length === 0) {
      return r;
    } else {
      return this;
    }
  };

  scale.label_size = function(label_size) {
    if (arguments.length === 0) {
      return label_size_;
    } else {
      label_size_ = label_size;
      return this;
    }
  };

  function lsize(label) {
    var size = typeof(label_size_) == "function" ? label_size_(label) : label_size_;
    size += padding_;
    return size;
  }

  scale.nticks = function(n) {
    if (arguments.length === 0) {
      return nticks_;
    } else {
      nticks_ = n;
      return this;
    }
  };

  scale.inside = function(i) {
    if (arguments.length === 0) {
      return inside_;
    } else {
      inside_ = i ? true : false;
      return this;
    }
  };

  scale.nice = function() {
    var r = lscale.range();
    var d = lscale.domain();
    var l = Math.abs(r[1] - r[0]);
    var w = wilkinson_ii(d[0], d[1], nticks_, lsize, l);
    if (inside_) {
      var w1 = lsize(w.labels[0]);
      var w2 = lsize(w.labels[w.labels.length-1]);
      var pad = w1/2 + w2/2;
      w = wilkinson_ii(d[0], d[1], nticks_, lsize, l-pad);
      if (r[0] < r[1]) {
        lscale.range([r[0]+w1/2, r[1]-w2/2]);
      } else {
        lscale.range([r[0]-w1/2, r[1]+w2/2]);
      }
    }
    domain = [w.lmin, w.lmax];
    lscale.domain([w.lmin, w.lmax]);
    ticks_ = w.labels;
    ndec_ = w.ndec;
    return this;
  };

  scale.ticks = function() {
    if (ticks_ === undefined) return lscale.ticks(nticks_);
    return ticks_;
    //return ticks_.map(function(t) { return format_number(t, "", ndec_);});
  };

  return scale;
}

if (grph.scale === undefined) grph.scale = {};
grph.scale.linear = grph_scale_linear();


function grph_scale_period() {

  var time_scale = d3.time.scale();
  var years_;
  var has_month_ = false;
  var has_quarter_ = false;

  function scale(val) {
    if ((val instanceof Date) || moment.isMoment(val)) {
      return time_scale(val);
    } else if (val && val.date && val.period) {
      time_scale(val.date);
    } else {
      val = "" + val;
      return time_scale(date_period(val).date);
    }
  }

  scale.has_month = function() {
    return has_month_;
  };

  scale.has_quarter = function() {
    return has_quarter_;
  };

  function determine_domain(periods) {
    var min = d3.min(periods, function(d) {
      return d.period.start;
    });
    var max = d3.max(periods, function(d) {
      return d.period.end;
    });
    var year_min = min.year();
    // max, is often 1st of January; period runs #until# 1st of janury
    var year_max = (max.subtract(1, "seconds")).year();
    // first attempt: plot complete years
    var domain_min = new Date(year_min + "-01-01");
    var domain_max = new Date((year_max+1) + "-01-01");
    var coverage = (max - min) / (domain_max - domain_min);
    if (coverage > settings('period_coverage')) return [domain_min, domain_max];
    // not enough coverage; determine if starting year or last year has least
    // coverage
    var year_min_coverage = new Date((year_min+1) + "-01-01") - min;
    var year_max_coverage = max - new Date(year_max + "-01-01");
    if (year_min_coverage >= year_max_coverage) {
      domain_max = max;
    } else {
      domain_min = min;
    }
    coverage = (max - min) / (domain_max - domain_min);
    if (coverage > settings('period_coverage')) return [domain_min, domain_max];
    // still not enough coverage; set domain equal to range
    domain_min = min;
    domain_max = max;
    return [domain_min, domain_max];
  }

  scale.domain = function(domain) {
    var periods = domain.map(date_period);
    // determine which years are in domain;
    years_ = d3.extent(periods, function(d) {
      return d.period.start.year();
    });
    // set domain
    time_scale.domain(determine_domain(periods));
    // determine which subunits of years should be drawn
    has_month_ = periods.reduce(function(p, d) {
      return p || d.type == "month";
    }, false);
    has_quarter_ = periods.reduce(function(p, d) {
      return p || d.type == "quarter";
    }, false);
    return this;
  };

  scale.range = function(range) {
    if (arguments.length === 0) return time_scale.range();
    time_scale.range(range);
    return this;
  };

  scale.ticks = function() {
    function is_inside_domain(period, domain) {
      return (period.period.start >= domain[0]) &&
        (period.period.end <= domain[1]);
    }

    var ticks = [];
    for (var year = years_[0]; year <= years_[1]; year++) {
      var tick = date_period(year + "-01-01/P1Y");
      tick.last = year == years_[1];
      tick.label = year;
      if (is_inside_domain(tick, time_scale.domain())) ticks.push(tick);

      if (scale.has_quarter()) {
        for (var q = 0; q < 4; q++) {
          tick = date_period(year + "-" + zero_pad(q*3+1, 2) + "-01/P3M");
          tick.last = q == 3;
          tick.label = q+1;
          if (is_inside_domain(tick, time_scale.domain()))
            ticks.push(tick);
        }
      }
      if (scale.has_month()) {
        for (var m = 0; m < 12; m++) {
          tick = date_period(year + "-" + zero_pad(m+1,2) + "-01/P1M");
          tick.last = (scale.has_quarter() && ((m+1) % 3) === 0) || m == 11;
          tick.label = m+1;
          if (is_inside_domain(tick, time_scale.domain()))
            ticks.push(tick);
        }
      }
    }
    return ticks;
  };

  return scale;
}


if (grph.scale === undefined) grph.scale = {};
grph.scale.period = grph_scale_period();


function grph_scale_size() {
  
  var max;
  var domain;

  function scale(v) {
    if (domain === undefined) {
      return settings("default_bubble");
    } else {
      var m = max === undefined ? settings("max_bubble") : max;
      return m * Math.sqrt(v)/Math.sqrt(domain[1]);
    }
  }

  scale.domain = function(d) {
    if (arguments.length === 0) {
      return domain;
    } else {
      domain = d3.extent(d);
      return this;
    }
  };

  scale.range = function(r) {
    if (arguments.length === 0) {
      return max === undefined ? settings("max_bubble") : max;
    } else {
      max = d3.max(r);
      return this;
    }
  };

  scale.ticks = function() {
    return undefined;
  };

  return scale;
}

if (grph.scale === undefined) grph.scale = {};
grph.scale.size = grph_scale_size();




var settings = function() {
  var s = {
    'default' : {
      'padding' : [2, 2, 2, 2],
      'label_padding' : 4,
      'sep' : 8,
      'point_size' : 3,
      'max_bubble' : 20,
      'default_bubble' : 5,
      'bar_padding' : 0.4,
      'tick_length' : 5,
      'tick_padding' : 2,
      'period_coverage' : 0.85
    }
  };

  function get(setting, type) {
    if (arguments.length === 0) {
      return settings;
    } else if (arguments.length === 2) {
      if (s[type] !== undefined && s[type][setting] !== undefined) {
        return s[type][setting];
      } else {
        return s.default[setting];
      }
    } else {
      return s.default[setting];
    }
  }

  get.set = function(setting, a, b) {
    if (arguments.length === 2) {
      s.default[setting] = a;
      return this;
    } else if (arguments.length === 3) {
      if (s[a] === undefined) s[a] = {};
      s[a][setting] = b;
      return this;
    } else {
      throw new Error("Need at leat two arguments.");
    }
  };

  return get;
}();

grph.settings = settings;


// Convert a number to string padding it with zeros until the number of 
// characters before the decimal symbol equals length (not including sign)
function zero_pad(num, length) {
  var n = Math.abs(num);
  var nzeros = Math.max(0, length - Math.floor(n).toString().length );
  var padding = Math.pow(10, nzeros).toString().substr(1);
  if( num < 0 ) {
    padding = '-' + padding;
  }
  return padding + n;
}


// Format a numeric value:
// - Make sure it is rounded to the correct number of decimals (ndec)
// - Use the correct decimal separator (dec)
// - Add a thousands separator (grp)
function format_number(label, unit, ndec, dec, grp) {
  if (isNaN(label)) return '';
  unit = unit || '';
  dec = dec || '.';
  grp = grp || ' ';
  // round number
  if (ndec !== undefined) {
    label = label.toFixed(ndec);
  } else {
    label = label.toString();
  }
  // Following based on code from 
  // http://www.mredkj.com/javascript/numberFormat.html
  x     = label.split('.');
  x1    = x[0];
  x2    = x.length > 1 ? dec + x[1] : '';
  if (grp !== '') {
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + grp + '$2');
    }
  }
  return(x1 + x2 + unit);
}





// Format a numeric value:
// - Make sure it is rounded to the correct number of decimals (ndec)
// - Use the correct decimal separator (dec)
// - Add a thousands separator (grp)
format_numeric = function(label, unit, ndec, dec, grp) {
  if (isNaN(label)) return '';
  if (unit === undefined) unit = '';
  if (dec === undefined) dec = ',';
  if (grp === undefined) grp = ' ';
  // round number
  if (ndec !== undefined) {
    label = label.toFixed(ndec);
  } else {
    label = label.toString();
  }
  // Following based on code from 
  // http://www.mredkj.com/javascript/numberFormat.html
  x     = label.split('.');
  x1    = x[0];
  x2    = x.length > 1 ? dec + x[1] : '';
  if (grp !== '') {
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + grp + '$2');
    }
  }
  return(x1 + x2 + unit);
};



// ============================================================================
// ====                         WILKINSON ALGORITHM                        ====
// ============================================================================


function wilkinson_ii(dmin, dmax, m, calc_label_width, axis_width, mmin, mmax, Q, precision, mincoverage) {
  // ============================ SUBROUTINES =================================

  // The following routine checks for overlap in the labels. This is used in the 
  // Wilkinson labeling algorithm below to ensure that the labels do not overlap.
  function overlap(lmin, lmax, lstep, calc_label_width, axis_width, ndec) {
    var width_max = lstep*axis_width/(lmax-lmin);
    for (var l = lmin; (l - lmax) <= 1E-10; l += lstep) {
      var w  = calc_label_width(l, ndec);
      if (w > width_max) return(true);
    }
    return(false);
  }

  // Perform one iteration of the Wilkinson algorithm
  function wilkinson_step(min, max, k, m, Q, mincoverage) {
    // default values
    Q               = Q         || [10, 1, 5, 2, 2.5, 3, 4, 1.5, 7, 6, 8, 9];
    precision       = precision || [1,  0, 0, 0,  -1, 0, 0,  -1, 0, 0, 0, 0];
    mincoverage     = mincoverage || 0.8;
    m               = m || k;
    // calculate some stats needed in loop
    var intervals   = k - 1;
    var delta       = (max - min) / intervals;
    var base        = Math.floor(Math.log(delta)/Math.LN10);
    var dbase       = Math.pow(10, base);
    // calculate granularity; one of the terms in score
    var granularity = 1 - Math.abs(k-m)/m;
    // initialise end result
    var best;
    // loop through all possible label positions with given k
    for(var i = 0; i < Q.length; i++) {
      // calculate label positions
      var tdelta = Q[i] * dbase;
      var tmin   = Math.floor(min/tdelta) * tdelta;
      var tmax   = tmin + intervals * tdelta;
      // calculate the number of decimals
      var ndec   = (base + precision[i]) < 0 ? Math.abs(base + precision[i]) : 0;
      // if label positions cover range
      if (tmin <= min && tmax >= max) {
        // calculate roundness and coverage part of score
        var roundness = 1 - (i - (tmin <= 0 && tmax >= 0)) / Q.length;
        var coverage  = (max-min)/(tmax-tmin);
        // if coverage high enough
        if (coverage > mincoverage && !overlap(tmin, tmax, tdelta, calc_label_width, axis_width, ndec)) {
          // calculate score
          var tnice = granularity + roundness + coverage;
          // if highest score
          if ((best === undefined) || (tnice > best.score)) {
            best = {
                'lmin'  : tmin,
                'lmax'  : tmax,
                'lstep' : tdelta,
                'score' : tnice,
                'ndec'  : ndec
              };
          }
        }
      }
    }
    // return
    return (best);
  }

  // =============================== MAIN =====================================
  // default values
  dmin             = Number(dmin);
  dmax             = Number(dmax);
  if (Math.abs(dmin - dmax) < 1E-10) {
    dmin = 0.96*dmin;
    dmax = 1.04*dmax;
  }
  calc_label_width = calc_label_width || function() { return(0);};
  axis_width       = axis_width || 1;
  Q                = Q         || [10, 1, 5, 2, 2.5, 3, 4, 1.5, 7, 6, 8, 9];
  precision        = precision || [1,  0, 0, 0,  -1, 0, 0,  -1, 0, 0, 0, 0];
  mincoverage      = mincoverage || 0.8;
  mmin             = mmin || 2;
  mmax             = mmax || Math.ceil(6*m);
  // initilise end result
  var best = {
      'lmin'  : dmin,
      'lmax'  : dmax,
      'lstep' : (dmax - dmin),
      'score' : -1E8,
      'ndec'  : 0
    };
  // calculate number of decimal places
  var x = String(best.lstep).split('.');
  best.ndec = x.length > 1 ? x[1].length : 0;
  // loop though all possible numbers of labels
  for (var k = mmin; k <= mmax; k++) { 
    // calculate best label position for current number of labels
    var result = wilkinson_step(dmin, dmax, k, m, Q, mincoverage);
    // check if current result has higher score
    if ((result !== undefined) && ((best === undefined) || (result.score > best.score))) {
      best = result;
    }
  }
  // generate label positions
  var labels = [];
  for (var l = best.lmin; (l - best.lmax) <= 1E-10; l += best.lstep) {
    labels.push(l);
  }
  best.labels = labels;
  return(best);
}



  
  grph.line = grph_graph_line;
  grph.map = grph_graph_map;
  grph.bubble = grph_graph_bubble;
  grph.bar = grph_graph_bar;

  this.grph = grph;

}());


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vbWVudC5qcyIsInR3aXguanMiLCJiZWdpbi5qcyIsImF4aXNfY2F0ZWdvcmljYWwuanMiLCJheGlzX2NobG9yb3BsZXRoLmpzIiwiYXhpc19jb2xvdXIuanMiLCJheGlzX2xpbmVhci5qcyIsImF4aXNfcGVyaW9kLmpzIiwiYXhpc19yZWdpb24uanMiLCJheGlzX3NpemUuanMiLCJheGlzX3NwbGl0LmpzIiwiYXhpc19zd2l0Y2guanMiLCJkYXRhcGFja2FnZS5qcyIsImRhdGVfcGVyaW9kLmpzIiwiZ2VuZXJpY19ncmFwaC5qcyIsImdyYXBoLmpzIiwiZ3JhcGhfYmFyLmpzIiwiZ3JhcGhfYnViYmxlLmpzIiwiZ3JhcGhfbGluZS5qcyIsImdyYXBoX21hcC5qcyIsImxhYmVsX3NpemUuanMiLCJzY2FsZV9jYXRlZ29yaWNhbC5qcyIsInNjYWxlX2NobG9yb3BsZXRoLmpzIiwic2NhbGVfY29sb3VyLmpzIiwic2NhbGVfbGluZWFyLmpzIiwic2NhbGVfcGVyaW9kLmpzIiwic2NhbGVfc2l6ZS5qcyIsInNldHRpbmdzLmpzIiwidXRpbHMuanMiLCJ3aWxraW5zb24uanMiLCJlbmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNXRCQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ3JwaC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vISBtb21lbnQuanNcbi8vISB2ZXJzaW9uIDogMi43LjBcbi8vISBhdXRob3JzIDogVGltIFdvb2QsIElza3JlbiBDaGVybmV2LCBNb21lbnQuanMgY29udHJpYnV0b3JzXG4vLyEgbGljZW5zZSA6IE1JVFxuLy8hIG1vbWVudGpzLmNvbVxuXG4oZnVuY3Rpb24gKHVuZGVmaW5lZCkge1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdGFudHNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgbW9tZW50LFxuICAgICAgICBWRVJTSU9OID0gXCIyLjcuMFwiLFxuICAgICAgICAvLyB0aGUgZ2xvYmFsLXNjb3BlIHRoaXMgaXMgTk9UIHRoZSBnbG9iYWwgb2JqZWN0IGluIE5vZGUuanNcbiAgICAgICAgZ2xvYmFsU2NvcGUgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHRoaXMsXG4gICAgICAgIG9sZEdsb2JhbE1vbWVudCxcbiAgICAgICAgcm91bmQgPSBNYXRoLnJvdW5kLFxuICAgICAgICBpLFxuXG4gICAgICAgIFlFQVIgPSAwLFxuICAgICAgICBNT05USCA9IDEsXG4gICAgICAgIERBVEUgPSAyLFxuICAgICAgICBIT1VSID0gMyxcbiAgICAgICAgTUlOVVRFID0gNCxcbiAgICAgICAgU0VDT05EID0gNSxcbiAgICAgICAgTUlMTElTRUNPTkQgPSA2LFxuXG4gICAgICAgIC8vIGludGVybmFsIHN0b3JhZ2UgZm9yIGxhbmd1YWdlIGNvbmZpZyBmaWxlc1xuICAgICAgICBsYW5ndWFnZXMgPSB7fSxcblxuICAgICAgICAvLyBtb21lbnQgaW50ZXJuYWwgcHJvcGVydGllc1xuICAgICAgICBtb21lbnRQcm9wZXJ0aWVzID0ge1xuICAgICAgICAgICAgX2lzQU1vbWVudE9iamVjdDogbnVsbCxcbiAgICAgICAgICAgIF9pIDogbnVsbCxcbiAgICAgICAgICAgIF9mIDogbnVsbCxcbiAgICAgICAgICAgIF9sIDogbnVsbCxcbiAgICAgICAgICAgIF9zdHJpY3QgOiBudWxsLFxuICAgICAgICAgICAgX3R6bSA6IG51bGwsXG4gICAgICAgICAgICBfaXNVVEMgOiBudWxsLFxuICAgICAgICAgICAgX29mZnNldCA6IG51bGwsICAvLyBvcHRpb25hbC4gQ29tYmluZSB3aXRoIF9pc1VUQ1xuICAgICAgICAgICAgX3BmIDogbnVsbCxcbiAgICAgICAgICAgIF9sYW5nIDogbnVsbCAgLy8gb3B0aW9uYWxcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBjaGVjayBmb3Igbm9kZUpTXG4gICAgICAgIGhhc01vZHVsZSA9ICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyksXG5cbiAgICAgICAgLy8gQVNQLk5FVCBqc29uIGRhdGUgZm9ybWF0IHJlZ2V4XG4gICAgICAgIGFzcE5ldEpzb25SZWdleCA9IC9eXFwvP0RhdGVcXCgoXFwtP1xcZCspL2ksXG4gICAgICAgIGFzcE5ldFRpbWVTcGFuSnNvblJlZ2V4ID0gLyhcXC0pPyg/OihcXGQqKVxcLik/KFxcZCspXFw6KFxcZCspKD86XFw6KFxcZCspXFwuPyhcXGR7M30pPyk/LyxcblxuICAgICAgICAvLyBmcm9tIGh0dHA6Ly9kb2NzLmNsb3N1cmUtbGlicmFyeS5nb29nbGVjb2RlLmNvbS9naXQvY2xvc3VyZV9nb29nX2RhdGVfZGF0ZS5qcy5zb3VyY2UuaHRtbFxuICAgICAgICAvLyBzb21ld2hhdCBtb3JlIGluIGxpbmUgd2l0aCA0LjQuMy4yIDIwMDQgc3BlYywgYnV0IGFsbG93cyBkZWNpbWFsIGFueXdoZXJlXG4gICAgICAgIGlzb0R1cmF0aW9uUmVnZXggPSAvXigtKT9QKD86KD86KFswLTksLl0qKVkpPyg/OihbMC05LC5dKilNKT8oPzooWzAtOSwuXSopRCk/KD86VCg/OihbMC05LC5dKilIKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKVMpPyk/fChbMC05LC5dKilXKSQvLFxuXG4gICAgICAgIC8vIGZvcm1hdCB0b2tlbnNcbiAgICAgICAgZm9ybWF0dGluZ1Rva2VucyA9IC8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhNb3xNTT9NP00/fERvfERERG98REQ/RD9EP3xkZGQ/ZD98ZG8/fHdbb3x3XT98V1tvfFddP3xRfFlZWVlZWXxZWVlZWXxZWVlZfFlZfGdnKGdnZz8pP3xHRyhHR0c/KT98ZXxFfGF8QXxoaD98SEg/fG1tP3xzcz98U3sxLDR9fFh8eno/fFpaP3wuKS9nLFxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTFR8TEw/TD9MP3xsezEsNH0pL2csXG5cbiAgICAgICAgLy8gcGFyc2luZyB0b2tlbiByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cyA9IC9cXGRcXGQ/LywgLy8gMCAtIDk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1RocmVlRGlnaXRzID0gL1xcZHsxLDN9LywgLy8gMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9Gb3VyRGlnaXRzID0gL1xcZHsxLDR9LywgLy8gMCAtIDk5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzID0gL1srXFwtXT9cXGR7MSw2fS8sIC8vIC05OTksOTk5IC0gOTk5LDk5OVxuICAgICAgICBwYXJzZVRva2VuRGlnaXRzID0gL1xcZCsvLCAvLyBub256ZXJvIG51bWJlciBvZiBkaWdpdHNcbiAgICAgICAgcGFyc2VUb2tlbldvcmQgPSAvWzAtOV0qWydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdK3xbXFx1MDYwMC1cXHUwNkZGXFwvXSsoXFxzKj9bXFx1MDYwMC1cXHUwNkZGXSspezEsMn0vaSwgLy8gYW55IHdvcmQgKG9yIHR3bykgY2hhcmFjdGVycyBvciBudW1iZXJzIGluY2x1ZGluZyB0d28vdGhyZWUgd29yZCBtb250aCBpbiBhcmFiaWMuXG4gICAgICAgIHBhcnNlVG9rZW5UaW1lem9uZSA9IC9afFtcXCtcXC1dXFxkXFxkOj9cXGRcXGQvZ2ksIC8vICswMDowMCAtMDA6MDAgKzAwMDAgLTAwMDAgb3IgWlxuICAgICAgICBwYXJzZVRva2VuVCA9IC9UL2ksIC8vIFQgKElTTyBzZXBhcmF0b3IpXG4gICAgICAgIHBhcnNlVG9rZW5UaW1lc3RhbXBNcyA9IC9bXFwrXFwtXT9cXGQrKFxcLlxcZHsxLDN9KT8vLCAvLyAxMjM0NTY3ODkgMTIzNDU2Nzg5LjEyM1xuICAgICAgICBwYXJzZVRva2VuT3JkaW5hbCA9IC9cXGR7MSwyfS8sXG5cbiAgICAgICAgLy9zdHJpY3QgcGFyc2luZyByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVEaWdpdCA9IC9cXGQvLCAvLyAwIC0gOVxuICAgICAgICBwYXJzZVRva2VuVHdvRGlnaXRzID0gL1xcZFxcZC8sIC8vIDAwIC0gOTlcbiAgICAgICAgcGFyc2VUb2tlblRocmVlRGlnaXRzID0gL1xcZHszfS8sIC8vIDAwMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuRm91ckRpZ2l0cyA9IC9cXGR7NH0vLCAvLyAwMDAwIC0gOTk5OVxuICAgICAgICBwYXJzZVRva2VuU2l4RGlnaXRzID0gL1srLV0/XFxkezZ9LywgLy8gLTk5OSw5OTkgLSA5OTksOTk5XG4gICAgICAgIHBhcnNlVG9rZW5TaWduZWROdW1iZXIgPSAvWystXT9cXGQrLywgLy8gLWluZiAtIGluZlxuXG4gICAgICAgIC8vIGlzbyA4NjAxIHJlZ2V4XG4gICAgICAgIC8vIDAwMDAtMDAtMDAgMDAwMC1XMDAgb3IgMDAwMC1XMDAtMCArIFQgKyAwMCBvciAwMDowMCBvciAwMDowMDowMCBvciAwMDowMDowMC4wMDAgKyArMDA6MDAgb3IgKzAwMDAgb3IgKzAwKVxuICAgICAgICBpc29SZWdleCA9IC9eXFxzKig/OlsrLV1cXGR7Nn18XFxkezR9KS0oPzooXFxkXFxkLVxcZFxcZCl8KFdcXGRcXGQkKXwoV1xcZFxcZC1cXGQpfChcXGRcXGRcXGQpKSgoVHwgKShcXGRcXGQoOlxcZFxcZCg6XFxkXFxkKFxcLlxcZCspPyk/KT8pPyhbXFwrXFwtXVxcZFxcZCg/Ojo/XFxkXFxkKT98XFxzKlopPyk/JC8sXG5cbiAgICAgICAgaXNvRm9ybWF0ID0gJ1lZWVktTU0tRERUSEg6bW06c3NaJyxcblxuICAgICAgICBpc29EYXRlcyA9IFtcbiAgICAgICAgICAgIFsnWVlZWVlZLU1NLUREJywgL1srLV1cXGR7Nn0tXFxkezJ9LVxcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLU1NLUREJywgL1xcZHs0fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgICAgICBbJ0dHR0ctW1ddV1ctRScsIC9cXGR7NH0tV1xcZHsyfS1cXGQvXSxcbiAgICAgICAgICAgIFsnR0dHRy1bV11XVycsIC9cXGR7NH0tV1xcZHsyfS9dLFxuICAgICAgICAgICAgWydZWVlZLURERCcsIC9cXGR7NH0tXFxkezN9L11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyBpc28gdGltZSBmb3JtYXRzIGFuZCByZWdleGVzXG4gICAgICAgIGlzb1RpbWVzID0gW1xuICAgICAgICAgICAgWydISDptbTpzcy5TU1NTJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGRcXC5cXGQrL10sXG4gICAgICAgICAgICBbJ0hIOm1tOnNzJywgLyhUfCApXFxkXFxkOlxcZFxcZDpcXGRcXGQvXSxcbiAgICAgICAgICAgIFsnSEg6bW0nLCAvKFR8IClcXGRcXGQ6XFxkXFxkL10sXG4gICAgICAgICAgICBbJ0hIJywgLyhUfCApXFxkXFxkL11cbiAgICAgICAgXSxcblxuICAgICAgICAvLyB0aW1lem9uZSBjaHVua2VyIFwiKzEwOjAwXCIgPiBbXCIxMFwiLCBcIjAwXCJdIG9yIFwiLTE1MzBcIiA+IFtcIi0xNVwiLCBcIjMwXCJdXG4gICAgICAgIHBhcnNlVGltZXpvbmVDaHVua2VyID0gLyhbXFwrXFwtXXxcXGRcXGQpL2dpLFxuXG4gICAgICAgIC8vIGdldHRlciBhbmQgc2V0dGVyIG5hbWVzXG4gICAgICAgIHByb3h5R2V0dGVyc0FuZFNldHRlcnMgPSAnRGF0ZXxIb3Vyc3xNaW51dGVzfFNlY29uZHN8TWlsbGlzZWNvbmRzJy5zcGxpdCgnfCcpLFxuICAgICAgICB1bml0TWlsbGlzZWNvbmRGYWN0b3JzID0ge1xuICAgICAgICAgICAgJ01pbGxpc2Vjb25kcycgOiAxLFxuICAgICAgICAgICAgJ1NlY29uZHMnIDogMWUzLFxuICAgICAgICAgICAgJ01pbnV0ZXMnIDogNmU0LFxuICAgICAgICAgICAgJ0hvdXJzJyA6IDM2ZTUsXG4gICAgICAgICAgICAnRGF5cycgOiA4NjRlNSxcbiAgICAgICAgICAgICdNb250aHMnIDogMjU5MmU2LFxuICAgICAgICAgICAgJ1llYXJzJyA6IDMxNTM2ZTZcbiAgICAgICAgfSxcblxuICAgICAgICB1bml0QWxpYXNlcyA9IHtcbiAgICAgICAgICAgIG1zIDogJ21pbGxpc2Vjb25kJyxcbiAgICAgICAgICAgIHMgOiAnc2Vjb25kJyxcbiAgICAgICAgICAgIG0gOiAnbWludXRlJyxcbiAgICAgICAgICAgIGggOiAnaG91cicsXG4gICAgICAgICAgICBkIDogJ2RheScsXG4gICAgICAgICAgICBEIDogJ2RhdGUnLFxuICAgICAgICAgICAgdyA6ICd3ZWVrJyxcbiAgICAgICAgICAgIFcgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICBNIDogJ21vbnRoJyxcbiAgICAgICAgICAgIFEgOiAncXVhcnRlcicsXG4gICAgICAgICAgICB5IDogJ3llYXInLFxuICAgICAgICAgICAgREREIDogJ2RheU9mWWVhcicsXG4gICAgICAgICAgICBlIDogJ3dlZWtkYXknLFxuICAgICAgICAgICAgRSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGdnOiAnd2Vla1llYXInLFxuICAgICAgICAgICAgR0c6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICBjYW1lbEZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIGRheW9meWVhciA6ICdkYXlPZlllYXInLFxuICAgICAgICAgICAgaXNvd2Vla2RheSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGlzb3dlZWsgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICB3ZWVreWVhciA6ICd3ZWVrWWVhcicsXG4gICAgICAgICAgICBpc293ZWVreWVhciA6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBmb3JtYXQgZnVuY3Rpb24gc3RyaW5nc1xuICAgICAgICBmb3JtYXRGdW5jdGlvbnMgPSB7fSxcblxuICAgICAgICAvLyBkZWZhdWx0IHJlbGF0aXZlIHRpbWUgdGhyZXNob2xkc1xuICAgICAgICByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzID0ge1xuICAgICAgICAgIHM6IDQ1LCAgIC8vc2Vjb25kcyB0byBtaW51dGVzXG4gICAgICAgICAgbTogNDUsICAgLy9taW51dGVzIHRvIGhvdXJzXG4gICAgICAgICAgaDogMjIsICAgLy9ob3VycyB0byBkYXlzXG4gICAgICAgICAgZGQ6IDI1LCAgLy9kYXlzIHRvIG1vbnRoIChtb250aCA9PSAxKVxuICAgICAgICAgIGRtOiA0NSwgIC8vZGF5cyB0byBtb250aHMgKG1vbnRocyA+IDEpXG4gICAgICAgICAgZHk6IDM0NSAgLy9kYXlzIHRvIHllYXJcbiAgICAgICAgfSxcblxuICAgICAgICAvLyB0b2tlbnMgdG8gb3JkaW5hbGl6ZSBhbmQgcGFkXG4gICAgICAgIG9yZGluYWxpemVUb2tlbnMgPSAnREREIHcgVyBNIEQgZCcuc3BsaXQoJyAnKSxcbiAgICAgICAgcGFkZGVkVG9rZW5zID0gJ00gRCBIIGggbSBzIHcgVycuc3BsaXQoJyAnKSxcblxuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIE0gICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU1NICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkubW9udGhzU2hvcnQodGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBNTU1NIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxhbmcoKS5tb250aHModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEREQgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRheU9mWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGQgICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkud2Vla2RheXNNaW4odGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZGQgIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxhbmcoKS53ZWVrZGF5c1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGRkZCA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkud2Vla2RheXModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3ICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBXICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzb1dlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWSAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB5ID0gdGhpcy55ZWFyKCksIHNpZ24gPSB5ID49IDAgPyAnKycgOiAnLSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWZ0WmVyb0ZpbGwoTWF0aC5hYnMoeSksIDYpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2dnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpLCA1KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHRyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHRyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc29XZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEggICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG91cnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCkgJSAxMiB8fCAxMjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1pbnV0ZXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlY29uZHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b0ludCh0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTUyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodG9JbnQodGhpcy5taWxsaXNlY29uZHMoKSAvIDEwKSwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1NTICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMubWlsbGlzZWNvbmRzKCksIDMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTU1MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLm1pbGxpc2Vjb25kcygpLCAzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBaICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gLXRoaXMuem9uZSgpLFxuICAgICAgICAgICAgICAgICAgICBiID0gXCIrXCI7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9IFwiLVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYiArIGxlZnRaZXJvRmlsbCh0b0ludChhIC8gNjApLCAyKSArIFwiOlwiICsgbGVmdFplcm9GaWxsKHRvSW50KGEpICUgNjAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFpaICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSAtdGhpcy56b25lKCksXG4gICAgICAgICAgICAgICAgICAgIGIgPSBcIitcIjtcbiAgICAgICAgICAgICAgICBpZiAoYSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYSA9IC1hO1xuICAgICAgICAgICAgICAgICAgICBiID0gXCItXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBiICsgbGVmdFplcm9GaWxsKHRvSW50KGEgLyA2MCksIDIpICsgbGVmdFplcm9GaWxsKHRvSW50KGEpICUgNjAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHogOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuem9uZUFiYnIoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB6eiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy56b25lTmFtZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFggICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5peCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFEgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVhcnRlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGxpc3RzID0gWydtb250aHMnLCAnbW9udGhzU2hvcnQnLCAnd2Vla2RheXMnLCAnd2Vla2RheXNTaG9ydCcsICd3ZWVrZGF5c01pbiddO1xuXG4gICAgLy8gUGljayB0aGUgZmlyc3QgZGVmaW5lZCBvZiB0d28gb3IgdGhyZWUgYXJndW1lbnRzLiBkZmwgY29tZXMgZnJvbVxuICAgIC8vIGRlZmF1bHQuXG4gICAgZnVuY3Rpb24gZGZsKGEsIGIsIGMpIHtcbiAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiBhICE9IG51bGwgPyBhIDogYjtcbiAgICAgICAgICAgIGNhc2UgMzogcmV0dXJuIGEgIT0gbnVsbCA/IGEgOiBiICE9IG51bGwgPyBiIDogYztcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihcIkltcGxlbWVudCBtZVwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlZmF1bHRQYXJzaW5nRmxhZ3MoKSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gZGVlcCBjbG9uZSB0aGlzIG9iamVjdCwgYW5kIGVzNSBzdGFuZGFyZCBpcyBub3QgdmVyeVxuICAgICAgICAvLyBoZWxwZnVsLlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZW1wdHkgOiBmYWxzZSxcbiAgICAgICAgICAgIHVudXNlZFRva2VucyA6IFtdLFxuICAgICAgICAgICAgdW51c2VkSW5wdXQgOiBbXSxcbiAgICAgICAgICAgIG92ZXJmbG93IDogLTIsXG4gICAgICAgICAgICBjaGFyc0xlZnRPdmVyIDogMCxcbiAgICAgICAgICAgIG51bGxJbnB1dCA6IGZhbHNlLFxuICAgICAgICAgICAgaW52YWxpZE1vbnRoIDogbnVsbCxcbiAgICAgICAgICAgIGludmFsaWRGb3JtYXQgOiBmYWxzZSxcbiAgICAgICAgICAgIHVzZXJJbnZhbGlkYXRlZCA6IGZhbHNlLFxuICAgICAgICAgICAgaXNvOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcHJlY2F0ZShtc2csIGZuKSB7XG4gICAgICAgIHZhciBmaXJzdFRpbWUgPSB0cnVlO1xuICAgICAgICBmdW5jdGlvbiBwcmludE1zZygpIHtcbiAgICAgICAgICAgIGlmIChtb21lbnQuc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZS53YXJuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRGVwcmVjYXRpb24gd2FybmluZzogXCIgKyBtc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBleHRlbmQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGZpcnN0VGltZSkge1xuICAgICAgICAgICAgICAgIHByaW50TXNnKCk7XG4gICAgICAgICAgICAgICAgZmlyc3RUaW1lID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSwgZm4pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhZFRva2VuKGZ1bmMsIGNvdW50KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbChmdW5jLmNhbGwodGhpcywgYSksIGNvdW50KTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gb3JkaW5hbGl6ZVRva2VuKGZ1bmMsIHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhbmcoKS5vcmRpbmFsKGZ1bmMuY2FsbCh0aGlzLCBhKSwgcGVyaW9kKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB3aGlsZSAob3JkaW5hbGl6ZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IG9yZGluYWxpemVUb2tlbnMucG9wKCk7XG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW2kgKyAnbyddID0gb3JkaW5hbGl6ZVRva2VuKGZvcm1hdFRva2VuRnVuY3Rpb25zW2ldLCBpKTtcbiAgICB9XG4gICAgd2hpbGUgKHBhZGRlZFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgaSA9IHBhZGRlZFRva2Vucy5wb3AoKTtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbaSArIGldID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnNbaV0sIDIpO1xuICAgIH1cbiAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucy5EREREID0gcGFkVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnMuRERELCAzKTtcblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdHJ1Y3RvcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBMYW5ndWFnZSgpIHtcblxuICAgIH1cblxuICAgIC8vIE1vbWVudCBwcm90b3R5cGUgb2JqZWN0XG4gICAgZnVuY3Rpb24gTW9tZW50KGNvbmZpZykge1xuICAgICAgICBjaGVja092ZXJmbG93KGNvbmZpZyk7XG4gICAgICAgIGV4dGVuZCh0aGlzLCBjb25maWcpO1xuICAgIH1cblxuICAgIC8vIER1cmF0aW9uIENvbnN0cnVjdG9yXG4gICAgZnVuY3Rpb24gRHVyYXRpb24oZHVyYXRpb24pIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGR1cmF0aW9uKSxcbiAgICAgICAgICAgIHllYXJzID0gbm9ybWFsaXplZElucHV0LnllYXIgfHwgMCxcbiAgICAgICAgICAgIHF1YXJ0ZXJzID0gbm9ybWFsaXplZElucHV0LnF1YXJ0ZXIgfHwgMCxcbiAgICAgICAgICAgIG1vbnRocyA9IG5vcm1hbGl6ZWRJbnB1dC5tb250aCB8fCAwLFxuICAgICAgICAgICAgd2Vla3MgPSBub3JtYWxpemVkSW5wdXQud2VlayB8fCAwLFxuICAgICAgICAgICAgZGF5cyA9IG5vcm1hbGl6ZWRJbnB1dC5kYXkgfHwgMCxcbiAgICAgICAgICAgIGhvdXJzID0gbm9ybWFsaXplZElucHV0LmhvdXIgfHwgMCxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSBub3JtYWxpemVkSW5wdXQubWludXRlIHx8IDAsXG4gICAgICAgICAgICBzZWNvbmRzID0gbm9ybWFsaXplZElucHV0LnNlY29uZCB8fCAwLFxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kIHx8IDA7XG5cbiAgICAgICAgLy8gcmVwcmVzZW50YXRpb24gZm9yIGRhdGVBZGRSZW1vdmVcbiAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzID0gK21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICBzZWNvbmRzICogMWUzICsgLy8gMTAwMFxuICAgICAgICAgICAgbWludXRlcyAqIDZlNCArIC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgaG91cnMgKiAzNmU1OyAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAvLyBCZWNhdXNlIG9mIGRhdGVBZGRSZW1vdmUgdHJlYXRzIDI0IGhvdXJzIGFzIGRpZmZlcmVudCBmcm9tIGFcbiAgICAgICAgLy8gZGF5IHdoZW4gd29ya2luZyBhcm91bmQgRFNULCB3ZSBuZWVkIHRvIHN0b3JlIHRoZW0gc2VwYXJhdGVseVxuICAgICAgICB0aGlzLl9kYXlzID0gK2RheXMgK1xuICAgICAgICAgICAgd2Vla3MgKiA3O1xuICAgICAgICAvLyBJdCBpcyBpbXBvc3NpYmxlIHRyYW5zbGF0ZSBtb250aHMgaW50byBkYXlzIHdpdGhvdXQga25vd2luZ1xuICAgICAgICAvLyB3aGljaCBtb250aHMgeW91IGFyZSBhcmUgdGFsa2luZyBhYm91dCwgc28gd2UgaGF2ZSB0byBzdG9yZVxuICAgICAgICAvLyBpdCBzZXBhcmF0ZWx5LlxuICAgICAgICB0aGlzLl9tb250aHMgPSArbW9udGhzICtcbiAgICAgICAgICAgIHF1YXJ0ZXJzICogMyArXG4gICAgICAgICAgICB5ZWFycyAqIDEyO1xuXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcblxuICAgICAgICB0aGlzLl9idWJibGUoKTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEhlbHBlcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIGV4dGVuZChhLCBiKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gYikge1xuICAgICAgICAgICAgaWYgKGIuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICBhW2ldID0gYltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChiLmhhc093blByb3BlcnR5KFwidG9TdHJpbmdcIikpIHtcbiAgICAgICAgICAgIGEudG9TdHJpbmcgPSBiLnRvU3RyaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGIuaGFzT3duUHJvcGVydHkoXCJ2YWx1ZU9mXCIpKSB7XG4gICAgICAgICAgICBhLnZhbHVlT2YgPSBiLnZhbHVlT2Y7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9uZU1vbWVudChtKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7fSwgaTtcbiAgICAgICAgZm9yIChpIGluIG0pIHtcbiAgICAgICAgICAgIGlmIChtLmhhc093blByb3BlcnR5KGkpICYmIG1vbWVudFByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBtW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhYnNSb3VuZChudW1iZXIpIHtcbiAgICAgICAgaWYgKG51bWJlciA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmNlaWwobnVtYmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKG51bWJlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsZWZ0IHplcm8gZmlsbCBhIG51bWJlclxuICAgIC8vIHNlZSBodHRwOi8vanNwZXJmLmNvbS9sZWZ0LXplcm8tZmlsbGluZyBmb3IgcGVyZm9ybWFuY2UgY29tcGFyaXNvblxuICAgIGZ1bmN0aW9uIGxlZnRaZXJvRmlsbChudW1iZXIsIHRhcmdldExlbmd0aCwgZm9yY2VTaWduKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSAnJyArIE1hdGguYWJzKG51bWJlciksXG4gICAgICAgICAgICBzaWduID0gbnVtYmVyID49IDA7XG5cbiAgICAgICAgd2hpbGUgKG91dHB1dC5sZW5ndGggPCB0YXJnZXRMZW5ndGgpIHtcbiAgICAgICAgICAgIG91dHB1dCA9ICcwJyArIG91dHB1dDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHNpZ24gPyAoZm9yY2VTaWduID8gJysnIDogJycpIDogJy0nKSArIG91dHB1dDtcbiAgICB9XG5cbiAgICAvLyBoZWxwZXIgZnVuY3Rpb24gZm9yIF8uYWRkVGltZSBhbmQgXy5zdWJ0cmFjdFRpbWVcbiAgICBmdW5jdGlvbiBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KG1vbSwgZHVyYXRpb24sIGlzQWRkaW5nLCB1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IGR1cmF0aW9uLl9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICBkYXlzID0gZHVyYXRpb24uX2RheXMsXG4gICAgICAgICAgICBtb250aHMgPSBkdXJhdGlvbi5fbW9udGhzO1xuICAgICAgICB1cGRhdGVPZmZzZXQgPSB1cGRhdGVPZmZzZXQgPT0gbnVsbCA/IHRydWUgOiB1cGRhdGVPZmZzZXQ7XG5cbiAgICAgICAgaWYgKG1pbGxpc2Vjb25kcykge1xuICAgICAgICAgICAgbW9tLl9kLnNldFRpbWUoK21vbS5fZCArIG1pbGxpc2Vjb25kcyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF5cykge1xuICAgICAgICAgICAgcmF3U2V0dGVyKG1vbSwgJ0RhdGUnLCByYXdHZXR0ZXIobW9tLCAnRGF0ZScpICsgZGF5cyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9udGhzKSB7XG4gICAgICAgICAgICByYXdNb250aFNldHRlcihtb20sIHJhd0dldHRlcihtb20sICdNb250aCcpICsgbW9udGhzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVPZmZzZXQpIHtcbiAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQobW9tLCBkYXlzIHx8IG1vbnRocyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiBpcyBhbiBhcnJheVxuICAgIGZ1bmN0aW9uIGlzQXJyYXkoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEYXRlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlucHV0KSA9PT0gJ1tvYmplY3QgRGF0ZV0nIHx8XG4gICAgICAgICAgICAgICAgaW5wdXQgaW5zdGFuY2VvZiBEYXRlO1xuICAgIH1cblxuICAgIC8vIGNvbXBhcmUgdHdvIGFycmF5cywgcmV0dXJuIHRoZSBudW1iZXIgb2YgZGlmZmVyZW5jZXNcbiAgICBmdW5jdGlvbiBjb21wYXJlQXJyYXlzKGFycmF5MSwgYXJyYXkyLCBkb250Q29udmVydCkge1xuICAgICAgICB2YXIgbGVuID0gTWF0aC5taW4oYXJyYXkxLmxlbmd0aCwgYXJyYXkyLmxlbmd0aCksXG4gICAgICAgICAgICBsZW5ndGhEaWZmID0gTWF0aC5hYnMoYXJyYXkxLmxlbmd0aCAtIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgZGlmZnMgPSAwLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKGRvbnRDb252ZXJ0ICYmIGFycmF5MVtpXSAhPT0gYXJyYXkyW2ldKSB8fFxuICAgICAgICAgICAgICAgICghZG9udENvbnZlcnQgJiYgdG9JbnQoYXJyYXkxW2ldKSAhPT0gdG9JbnQoYXJyYXkyW2ldKSkpIHtcbiAgICAgICAgICAgICAgICBkaWZmcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWZmcyArIGxlbmd0aERpZmY7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplVW5pdHModW5pdHMpIHtcbiAgICAgICAgaWYgKHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgbG93ZXJlZCA9IHVuaXRzLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvKC4pcyQvLCAnJDEnKTtcbiAgICAgICAgICAgIHVuaXRzID0gdW5pdEFsaWFzZXNbdW5pdHNdIHx8IGNhbWVsRnVuY3Rpb25zW2xvd2VyZWRdIHx8IGxvd2VyZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuaXRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZU9iamVjdFVuaXRzKGlucHV0T2JqZWN0KSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSB7fSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wLFxuICAgICAgICAgICAgcHJvcDtcblxuICAgICAgICBmb3IgKHByb3AgaW4gaW5wdXRPYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dE9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wID0gbm9ybWFsaXplVW5pdHMocHJvcCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dFtub3JtYWxpemVkUHJvcF0gPSBpbnB1dE9iamVjdFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9ybWFsaXplZElucHV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VMaXN0KGZpZWxkKSB7XG4gICAgICAgIHZhciBjb3VudCwgc2V0dGVyO1xuXG4gICAgICAgIGlmIChmaWVsZC5pbmRleE9mKCd3ZWVrJykgPT09IDApIHtcbiAgICAgICAgICAgIGNvdW50ID0gNztcbiAgICAgICAgICAgIHNldHRlciA9ICdkYXknO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGZpZWxkLmluZGV4T2YoJ21vbnRoJykgPT09IDApIHtcbiAgICAgICAgICAgIGNvdW50ID0gMTI7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnbW9udGgnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbW9tZW50W2ZpZWxkXSA9IGZ1bmN0aW9uIChmb3JtYXQsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaSwgZ2V0dGVyLFxuICAgICAgICAgICAgICAgIG1ldGhvZCA9IG1vbWVudC5mbi5fbGFuZ1tmaWVsZF0sXG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZvcm1hdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGZvcm1hdDtcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdldHRlciA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBtb21lbnQoKS51dGMoKS5zZXQoc2V0dGVyLCBpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWV0aG9kLmNhbGwobW9tZW50LmZuLl9sYW5nLCBtLCBmb3JtYXQgfHwgJycpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGluZGV4ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0dGVyKGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChnZXR0ZXIoaSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b0ludChhcmd1bWVudEZvckNvZXJjaW9uKSB7XG4gICAgICAgIHZhciBjb2VyY2VkTnVtYmVyID0gK2FyZ3VtZW50Rm9yQ29lcmNpb24sXG4gICAgICAgICAgICB2YWx1ZSA9IDA7XG5cbiAgICAgICAgaWYgKGNvZXJjZWROdW1iZXIgIT09IDAgJiYgaXNGaW5pdGUoY29lcmNlZE51bWJlcikpIHtcbiAgICAgICAgICAgIGlmIChjb2VyY2VkTnVtYmVyID49IDApIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGguZmxvb3IoY29lcmNlZE51bWJlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5jZWlsKGNvZXJjZWROdW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJbk1vbnRoKHllYXIsIG1vbnRoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCArIDEsIDApKS5nZXRVVENEYXRlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd2Vla3NJblllYXIoeWVhciwgZG93LCBkb3kpIHtcbiAgICAgICAgcmV0dXJuIHdlZWtPZlllYXIobW9tZW50KFt5ZWFyLCAxMSwgMzEgKyBkb3cgLSBkb3ldKSwgZG93LCBkb3kpLndlZWs7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5c0luWWVhcih5ZWFyKSB7XG4gICAgICAgIHJldHVybiBpc0xlYXBZZWFyKHllYXIpID8gMzY2IDogMzY1O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzTGVhcFllYXIoeWVhcikge1xuICAgICAgICByZXR1cm4gKHllYXIgJSA0ID09PSAwICYmIHllYXIgJSAxMDAgIT09IDApIHx8IHllYXIgJSA0MDAgPT09IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tPdmVyZmxvdyhtKSB7XG4gICAgICAgIHZhciBvdmVyZmxvdztcbiAgICAgICAgaWYgKG0uX2EgJiYgbS5fcGYub3ZlcmZsb3cgPT09IC0yKSB7XG4gICAgICAgICAgICBvdmVyZmxvdyA9XG4gICAgICAgICAgICAgICAgbS5fYVtNT05USF0gPCAwIHx8IG0uX2FbTU9OVEhdID4gMTEgPyBNT05USCA6XG4gICAgICAgICAgICAgICAgbS5fYVtEQVRFXSA8IDEgfHwgbS5fYVtEQVRFXSA+IGRheXNJbk1vbnRoKG0uX2FbWUVBUl0sIG0uX2FbTU9OVEhdKSA/IERBVEUgOlxuICAgICAgICAgICAgICAgIG0uX2FbSE9VUl0gPCAwIHx8IG0uX2FbSE9VUl0gPiAyMyA/IEhPVVIgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlOVVRFXSA8IDAgfHwgbS5fYVtNSU5VVEVdID4gNTkgPyBNSU5VVEUgOlxuICAgICAgICAgICAgICAgIG0uX2FbU0VDT05EXSA8IDAgfHwgbS5fYVtTRUNPTkRdID4gNTkgPyBTRUNPTkQgOlxuICAgICAgICAgICAgICAgIG0uX2FbTUlMTElTRUNPTkRdIDwgMCB8fCBtLl9hW01JTExJU0VDT05EXSA+IDk5OSA/IE1JTExJU0VDT05EIDpcbiAgICAgICAgICAgICAgICAtMTtcblxuICAgICAgICAgICAgaWYgKG0uX3BmLl9vdmVyZmxvd0RheU9mWWVhciAmJiAob3ZlcmZsb3cgPCBZRUFSIHx8IG92ZXJmbG93ID4gREFURSkpIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdyA9IERBVEU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG0uX3BmLm92ZXJmbG93ID0gb3ZlcmZsb3c7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1ZhbGlkKG0pIHtcbiAgICAgICAgaWYgKG0uX2lzVmFsaWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgbS5faXNWYWxpZCA9ICFpc05hTihtLl9kLmdldFRpbWUoKSkgJiZcbiAgICAgICAgICAgICAgICBtLl9wZi5vdmVyZmxvdyA8IDAgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuZW1wdHkgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuaW52YWxpZE1vbnRoICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLm51bGxJbnB1dCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5pbnZhbGlkRm9ybWF0ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLnVzZXJJbnZhbGlkYXRlZDtcblxuICAgICAgICAgICAgaWYgKG0uX3N0cmljdCkge1xuICAgICAgICAgICAgICAgIG0uX2lzVmFsaWQgPSBtLl9pc1ZhbGlkICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLmNoYXJzTGVmdE92ZXIgPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgbS5fcGYudW51c2VkVG9rZW5zLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS5faXNWYWxpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVMYW5ndWFnZShrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleSA/IGtleS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoJ18nLCAnLScpIDoga2V5O1xuICAgIH1cblxuICAgIC8vIFJldHVybiBhIG1vbWVudCBmcm9tIGlucHV0LCB0aGF0IGlzIGxvY2FsL3V0Yy96b25lIGVxdWl2YWxlbnQgdG8gbW9kZWwuXG4gICAgZnVuY3Rpb24gbWFrZUFzKGlucHV0LCBtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuX2lzVVRDID8gbW9tZW50KGlucHV0KS56b25lKG1vZGVsLl9vZmZzZXQgfHwgMCkgOlxuICAgICAgICAgICAgbW9tZW50KGlucHV0KS5sb2NhbCgpO1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgTGFuZ3VhZ2VzXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBleHRlbmQoTGFuZ3VhZ2UucHJvdG90eXBlLCB7XG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgdmFyIHByb3AsIGk7XG4gICAgICAgICAgICBmb3IgKGkgaW4gY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IGNvbmZpZ1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3AgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1snXycgKyBpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9tb250aHMgOiBcIkphbnVhcnlfRmVicnVhcnlfTWFyY2hfQXByaWxfTWF5X0p1bmVfSnVseV9BdWd1c3RfU2VwdGVtYmVyX09jdG9iZXJfTm92ZW1iZXJfRGVjZW1iZXJcIi5zcGxpdChcIl9cIiksXG4gICAgICAgIG1vbnRocyA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzW20ubW9udGgoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21vbnRoc1Nob3J0IDogXCJKYW5fRmViX01hcl9BcHJfTWF5X0p1bl9KdWxfQXVnX1NlcF9PY3RfTm92X0RlY1wiLnNwbGl0KFwiX1wiKSxcbiAgICAgICAgbW9udGhzU2hvcnQgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21vbnRoc1Nob3J0W20ubW9udGgoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgbW9udGhzUGFyc2UgOiBmdW5jdGlvbiAobW9udGhOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9tb250aHNQYXJzZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9tb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICBtb20gPSBtb21lbnQudXRjKFsyMDAwLCBpXSk7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2V4ID0gJ14nICsgdGhpcy5tb250aHMobW9tLCAnJykgKyAnfF4nICsgdGhpcy5tb250aHNTaG9ydChtb20sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbW9udGhzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKHJlZ2V4LnJlcGxhY2UoJy4nLCAnJyksICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRlc3QgdGhlIHJlZ2V4XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX21vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWtkYXlzIDogXCJTdW5kYXlfTW9uZGF5X1R1ZXNkYXlfV2VkbmVzZGF5X1RodXJzZGF5X0ZyaWRheV9TYXR1cmRheVwiLnNwbGl0KFwiX1wiKSxcbiAgICAgICAgd2Vla2RheXMgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzW20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5c1Nob3J0IDogXCJTdW5fTW9uX1R1ZV9XZWRfVGh1X0ZyaV9TYXRcIi5zcGxpdChcIl9cIiksXG4gICAgICAgIHdlZWtkYXlzU2hvcnQgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzU2hvcnRbbS5kYXkoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWtkYXlzTWluIDogXCJTdV9Nb19UdV9XZV9UaF9Gcl9TYVwiLnNwbGl0KFwiX1wiKSxcbiAgICAgICAgd2Vla2RheXNNaW4gOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzTWluW20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtkYXlzUGFyc2UgOiBmdW5jdGlvbiAod2Vla2RheU5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpLCBtb20sIHJlZ2V4O1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3dlZWtkYXlzUGFyc2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBtYWtlIHRoZSByZWdleCBpZiB3ZSBkb24ndCBoYXZlIGl0IGFscmVhZHlcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX3dlZWtkYXlzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbW9tID0gbW9tZW50KFsyMDAwLCAxXSkuZGF5KGkpO1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMud2Vla2RheXMobW9tLCAnJykgKyAnfF4nICsgdGhpcy53ZWVrZGF5c1Nob3J0KG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNNaW4obW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dlZWtkYXlzUGFyc2VbaV0gPSBuZXcgUmVnRXhwKHJlZ2V4LnJlcGxhY2UoJy4nLCAnJyksICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRlc3QgdGhlIHJlZ2V4XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dlZWtkYXlzUGFyc2VbaV0udGVzdCh3ZWVrZGF5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9sb25nRGF0ZUZvcm1hdCA6IHtcbiAgICAgICAgICAgIExUIDogXCJoOm1tIEFcIixcbiAgICAgICAgICAgIEwgOiBcIk1NL0REL1lZWVlcIixcbiAgICAgICAgICAgIExMIDogXCJNTU1NIEQgWVlZWVwiLFxuICAgICAgICAgICAgTExMIDogXCJNTU1NIEQgWVlZWSBMVFwiLFxuICAgICAgICAgICAgTExMTCA6IFwiZGRkZCwgTU1NTSBEIFlZWVkgTFRcIlxuICAgICAgICB9LFxuICAgICAgICBsb25nRGF0ZUZvcm1hdCA6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldO1xuICAgICAgICAgICAgaWYgKCFvdXRwdXQgJiYgdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5LnRvVXBwZXJDYXNlKCldKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5LnRvVXBwZXJDYXNlKCldLnJlcGxhY2UoL01NTU18TU18RER8ZGRkZC9nLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XSA9IG91dHB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNQTSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgLy8gSUU4IFF1aXJrcyBNb2RlICYgSUU3IFN0YW5kYXJkcyBNb2RlIGRvIG5vdCBhbGxvdyBhY2Nlc3Npbmcgc3RyaW5ncyBsaWtlIGFycmF5c1xuICAgICAgICAgICAgLy8gVXNpbmcgY2hhckF0IHNob3VsZCBiZSBtb3JlIGNvbXBhdGlibGUuXG4gICAgICAgICAgICByZXR1cm4gKChpbnB1dCArICcnKS50b0xvd2VyQ2FzZSgpLmNoYXJBdCgwKSA9PT0gJ3AnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbWVyaWRpZW1QYXJzZSA6IC9bYXBdXFwuP20/XFwuPy9pLFxuICAgICAgICBtZXJpZGllbSA6IGZ1bmN0aW9uIChob3VycywgbWludXRlcywgaXNMb3dlcikge1xuICAgICAgICAgICAgaWYgKGhvdXJzID4gMTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNMb3dlciA/ICdwbScgOiAnUE0nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNMb3dlciA/ICdhbScgOiAnQU0nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF9jYWxlbmRhciA6IHtcbiAgICAgICAgICAgIHNhbWVEYXkgOiAnW1RvZGF5IGF0XSBMVCcsXG4gICAgICAgICAgICBuZXh0RGF5IDogJ1tUb21vcnJvdyBhdF0gTFQnLFxuICAgICAgICAgICAgbmV4dFdlZWsgOiAnZGRkZCBbYXRdIExUJyxcbiAgICAgICAgICAgIGxhc3REYXkgOiAnW1llc3RlcmRheSBhdF0gTFQnLFxuICAgICAgICAgICAgbGFzdFdlZWsgOiAnW0xhc3RdIGRkZGQgW2F0XSBMVCcsXG4gICAgICAgICAgICBzYW1lRWxzZSA6ICdMJ1xuICAgICAgICB9LFxuICAgICAgICBjYWxlbmRhciA6IGZ1bmN0aW9uIChrZXksIG1vbSkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2NhbGVuZGFyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJyA/IG91dHB1dC5hcHBseShtb20pIDogb3V0cHV0O1xuICAgICAgICB9LFxuXG4gICAgICAgIF9yZWxhdGl2ZVRpbWUgOiB7XG4gICAgICAgICAgICBmdXR1cmUgOiBcImluICVzXCIsXG4gICAgICAgICAgICBwYXN0IDogXCIlcyBhZ29cIixcbiAgICAgICAgICAgIHMgOiBcImEgZmV3IHNlY29uZHNcIixcbiAgICAgICAgICAgIG0gOiBcImEgbWludXRlXCIsXG4gICAgICAgICAgICBtbSA6IFwiJWQgbWludXRlc1wiLFxuICAgICAgICAgICAgaCA6IFwiYW4gaG91clwiLFxuICAgICAgICAgICAgaGggOiBcIiVkIGhvdXJzXCIsXG4gICAgICAgICAgICBkIDogXCJhIGRheVwiLFxuICAgICAgICAgICAgZGQgOiBcIiVkIGRheXNcIixcbiAgICAgICAgICAgIE0gOiBcImEgbW9udGhcIixcbiAgICAgICAgICAgIE1NIDogXCIlZCBtb250aHNcIixcbiAgICAgICAgICAgIHkgOiBcImEgeWVhclwiLFxuICAgICAgICAgICAgeXkgOiBcIiVkIHllYXJzXCJcbiAgICAgICAgfSxcbiAgICAgICAgcmVsYXRpdmVUaW1lIDogZnVuY3Rpb24gKG51bWJlciwgd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX3JlbGF0aXZlVGltZVtzdHJpbmddO1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2Ygb3V0cHV0ID09PSAnZnVuY3Rpb24nKSA/XG4gICAgICAgICAgICAgICAgb3V0cHV0KG51bWJlciwgd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSkgOlxuICAgICAgICAgICAgICAgIG91dHB1dC5yZXBsYWNlKC8lZC9pLCBudW1iZXIpO1xuICAgICAgICB9LFxuICAgICAgICBwYXN0RnV0dXJlIDogZnVuY3Rpb24gKGRpZmYsIG91dHB1dCkge1xuICAgICAgICAgICAgdmFyIGZvcm1hdCA9IHRoaXMuX3JlbGF0aXZlVGltZVtkaWZmID4gMCA/ICdmdXR1cmUnIDogJ3Bhc3QnXTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgZm9ybWF0ID09PSAnZnVuY3Rpb24nID8gZm9ybWF0KG91dHB1dCkgOiBmb3JtYXQucmVwbGFjZSgvJXMvaSwgb3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29yZGluYWwucmVwbGFjZShcIiVkXCIsIG51bWJlcik7XG4gICAgICAgIH0sXG4gICAgICAgIF9vcmRpbmFsIDogXCIlZFwiLFxuXG4gICAgICAgIHByZXBhcnNlIDogZnVuY3Rpb24gKHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgfSxcblxuICAgICAgICBwb3N0Zm9ybWF0IDogZnVuY3Rpb24gKHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrIDogZnVuY3Rpb24gKG1vbSkge1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtPZlllYXIobW9tLCB0aGlzLl93ZWVrLmRvdywgdGhpcy5fd2Vlay5kb3kpLndlZWs7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWsgOiB7XG4gICAgICAgICAgICBkb3cgOiAwLCAvLyBTdW5kYXkgaXMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2Vlay5cbiAgICAgICAgICAgIGRveSA6IDYgIC8vIFRoZSB3ZWVrIHRoYXQgY29udGFpbnMgSmFuIDFzdCBpcyB0aGUgZmlyc3Qgd2VlayBvZiB0aGUgeWVhci5cbiAgICAgICAgfSxcblxuICAgICAgICBfaW52YWxpZERhdGU6ICdJbnZhbGlkIGRhdGUnLFxuICAgICAgICBpbnZhbGlkRGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ludmFsaWREYXRlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBMb2FkcyBhIGxhbmd1YWdlIGRlZmluaXRpb24gaW50byB0aGUgYGxhbmd1YWdlc2AgY2FjaGUuICBUaGUgZnVuY3Rpb25cbiAgICAvLyB0YWtlcyBhIGtleSBhbmQgb3B0aW9uYWxseSB2YWx1ZXMuICBJZiBub3QgaW4gdGhlIGJyb3dzZXIgYW5kIG5vIHZhbHVlc1xuICAgIC8vIGFyZSBwcm92aWRlZCwgaXQgd2lsbCBsb2FkIHRoZSBsYW5ndWFnZSBmaWxlIG1vZHVsZS4gIEFzIGEgY29udmVuaWVuY2UsXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBhbHNvIHJldHVybnMgdGhlIGxhbmd1YWdlIHZhbHVlcy5cbiAgICBmdW5jdGlvbiBsb2FkTGFuZyhrZXksIHZhbHVlcykge1xuICAgICAgICB2YWx1ZXMuYWJiciA9IGtleTtcbiAgICAgICAgaWYgKCFsYW5ndWFnZXNba2V5XSkge1xuICAgICAgICAgICAgbGFuZ3VhZ2VzW2tleV0gPSBuZXcgTGFuZ3VhZ2UoKTtcbiAgICAgICAgfVxuICAgICAgICBsYW5ndWFnZXNba2V5XS5zZXQodmFsdWVzKTtcbiAgICAgICAgcmV0dXJuIGxhbmd1YWdlc1trZXldO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBhIGxhbmd1YWdlIGZyb20gdGhlIGBsYW5ndWFnZXNgIGNhY2hlLiBNb3N0bHkgdXNlZnVsIGluIHRlc3RzLlxuICAgIGZ1bmN0aW9uIHVubG9hZExhbmcoa2V5KSB7XG4gICAgICAgIGRlbGV0ZSBsYW5ndWFnZXNba2V5XTtcbiAgICB9XG5cbiAgICAvLyBEZXRlcm1pbmVzIHdoaWNoIGxhbmd1YWdlIGRlZmluaXRpb24gdG8gdXNlIGFuZCByZXR1cm5zIGl0LlxuICAgIC8vXG4gICAgLy8gV2l0aCBubyBwYXJhbWV0ZXJzLCBpdCB3aWxsIHJldHVybiB0aGUgZ2xvYmFsIGxhbmd1YWdlLiAgSWYgeW91XG4gICAgLy8gcGFzcyBpbiBhIGxhbmd1YWdlIGtleSwgc3VjaCBhcyAnZW4nLCBpdCB3aWxsIHJldHVybiB0aGVcbiAgICAvLyBkZWZpbml0aW9uIGZvciAnZW4nLCBzbyBsb25nIGFzICdlbicgaGFzIGFscmVhZHkgYmVlbiBsb2FkZWQgdXNpbmdcbiAgICAvLyBtb21lbnQubGFuZy5cbiAgICBmdW5jdGlvbiBnZXRMYW5nRGVmaW5pdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGkgPSAwLCBqLCBsYW5nLCBuZXh0LCBzcGxpdCxcbiAgICAgICAgICAgIGdldCA9IGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFsYW5ndWFnZXNba10gJiYgaGFzTW9kdWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlKCcuL2xhbmcvJyArIGspO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxhbmd1YWdlc1trXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuZm4uX2xhbmc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkoa2V5KSkge1xuICAgICAgICAgICAgLy9zaG9ydC1jaXJjdWl0IGV2ZXJ5dGhpbmcgZWxzZVxuICAgICAgICAgICAgbGFuZyA9IGdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGxhbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGFuZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleSA9IFtrZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9waWNrIHRoZSBsYW5ndWFnZSBmcm9tIHRoZSBhcnJheVxuICAgICAgICAvL3RyeSBbJ2VuLWF1JywgJ2VuLWdiJ10gYXMgJ2VuLWF1JywgJ2VuLWdiJywgJ2VuJywgYXMgaW4gbW92ZSB0aHJvdWdoIHRoZSBsaXN0IHRyeWluZyBlYWNoXG4gICAgICAgIC8vc3Vic3RyaW5nIGZyb20gbW9zdCBzcGVjaWZpYyB0byBsZWFzdCwgYnV0IG1vdmUgdG8gdGhlIG5leHQgYXJyYXkgaXRlbSBpZiBpdCdzIGEgbW9yZSBzcGVjaWZpYyB2YXJpYW50IHRoYW4gdGhlIGN1cnJlbnQgcm9vdFxuICAgICAgICB3aGlsZSAoaSA8IGtleS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHNwbGl0ID0gbm9ybWFsaXplTGFuZ3VhZ2Uoa2V5W2ldKS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgaiA9IHNwbGl0Lmxlbmd0aDtcbiAgICAgICAgICAgIG5leHQgPSBub3JtYWxpemVMYW5ndWFnZShrZXlbaSArIDFdKTtcbiAgICAgICAgICAgIG5leHQgPSBuZXh0ID8gbmV4dC5zcGxpdCgnLScpIDogbnVsbDtcbiAgICAgICAgICAgIHdoaWxlIChqID4gMCkge1xuICAgICAgICAgICAgICAgIGxhbmcgPSBnZXQoc3BsaXQuc2xpY2UoMCwgaikuam9pbignLScpKTtcbiAgICAgICAgICAgICAgICBpZiAobGFuZykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFuZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5sZW5ndGggPj0gaiAmJiBjb21wYXJlQXJyYXlzKHNwbGl0LCBuZXh0LCB0cnVlKSA+PSBqIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL3RoZSBuZXh0IGFycmF5IGl0ZW0gaXMgYmV0dGVyIHRoYW4gYSBzaGFsbG93ZXIgc3Vic3RyaW5nIG9mIHRoaXMgb25lXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1vbWVudC5mbi5fbGFuZztcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEZvcm1hdHRpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoaW5wdXQpIHtcbiAgICAgICAgaWYgKGlucHV0Lm1hdGNoKC9cXFtbXFxzXFxTXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXlxcW3xcXF0kL2csIFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnB1dC5yZXBsYWNlKC9cXFxcL2csIFwiXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gZm9ybWF0Lm1hdGNoKGZvcm1hdHRpbmdUb2tlbnMpLCBpLCBsZW5ndGg7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV0pIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaV0gPSByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGFycmF5W2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAobW9tKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gXCJcIjtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG91dHB1dCArPSBhcnJheVtpXSBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gYXJyYXlbaV0uY2FsbChtb20sIGZvcm1hdCkgOiBhcnJheVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gZm9ybWF0IGRhdGUgdXNpbmcgbmF0aXZlIGRhdGUgb2JqZWN0XG4gICAgZnVuY3Rpb24gZm9ybWF0TW9tZW50KG0sIGZvcm1hdCkge1xuXG4gICAgICAgIGlmICghbS5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBtLmxhbmcoKS5pbnZhbGlkRGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9ybWF0ID0gZXhwYW5kRm9ybWF0KGZvcm1hdCwgbS5sYW5nKCkpO1xuXG4gICAgICAgIGlmICghZm9ybWF0RnVuY3Rpb25zW2Zvcm1hdF0pIHtcbiAgICAgICAgICAgIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdID0gbWFrZUZvcm1hdEZ1bmN0aW9uKGZvcm1hdCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0RnVuY3Rpb25zW2Zvcm1hdF0obSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhwYW5kRm9ybWF0KGZvcm1hdCwgbGFuZykge1xuICAgICAgICB2YXIgaSA9IDU7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGFuZy5sb25nRGF0ZUZvcm1hdChpbnB1dCkgfHwgaW5wdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgd2hpbGUgKGkgPj0gMCAmJiBsb2NhbEZvcm1hdHRpbmdUb2tlbnMudGVzdChmb3JtYXQpKSB7XG4gICAgICAgICAgICBmb3JtYXQgPSBmb3JtYXQucmVwbGFjZShsb2NhbEZvcm1hdHRpbmdUb2tlbnMsIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2Vucyk7XG4gICAgICAgICAgICBsb2NhbEZvcm1hdHRpbmdUb2tlbnMubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgIGkgLT0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFBhcnNpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGdldCB0aGUgcmVnZXggdG8gZmluZCB0aGUgbmV4dCB0b2tlblxuICAgIGZ1bmN0aW9uIGdldFBhcnNlUmVnZXhGb3JUb2tlbih0b2tlbiwgY29uZmlnKSB7XG4gICAgICAgIHZhciBhLCBzdHJpY3QgPSBjb25maWcuX3N0cmljdDtcbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7XG4gICAgICAgIGNhc2UgJ0REREQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnWVlZWSc6XG4gICAgICAgIGNhc2UgJ0dHR0cnOlxuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuRm91ckRpZ2l0cyA6IHBhcnNlVG9rZW5PbmVUb0ZvdXJEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1knOlxuICAgICAgICBjYXNlICdHJzpcbiAgICAgICAgY2FzZSAnZyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblNpZ25lZE51bWJlcjtcbiAgICAgICAgY2FzZSAnWVlZWVlZJzpcbiAgICAgICAgY2FzZSAnWVlZWVknOlxuICAgICAgICBjYXNlICdHR0dHRyc6XG4gICAgICAgIGNhc2UgJ2dnZ2dnJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuU2l4RGlnaXRzIDogcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzO1xuICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHsgcmV0dXJuIHBhcnNlVG9rZW5PbmVEaWdpdDsgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7IHJldHVybiBwYXJzZVRva2VuVHdvRGlnaXRzOyB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ1NTUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7IHJldHVybiBwYXJzZVRva2VuVGhyZWVEaWdpdHM7IH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnREREJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cztcbiAgICAgICAgY2FzZSAnTU1NJzpcbiAgICAgICAgY2FzZSAnTU1NTSc6XG4gICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgY2FzZSAnZGRkJzpcbiAgICAgICAgY2FzZSAnZGRkZCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbldvcmQ7XG4gICAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBjYXNlICdBJzpcbiAgICAgICAgICAgIHJldHVybiBnZXRMYW5nRGVmaW5pdGlvbihjb25maWcuX2wpLl9tZXJpZGllbVBhcnNlO1xuICAgICAgICBjYXNlICdYJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGltZXN0YW1wTXM7XG4gICAgICAgIGNhc2UgJ1onOlxuICAgICAgICBjYXNlICdaWic6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRpbWV6b25lO1xuICAgICAgICBjYXNlICdUJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVDtcbiAgICAgICAgY2FzZSAnU1NTUyc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbkRpZ2l0cztcbiAgICAgICAgY2FzZSAnTU0nOlxuICAgICAgICBjYXNlICdERCc6XG4gICAgICAgIGNhc2UgJ1lZJzpcbiAgICAgICAgY2FzZSAnR0cnOlxuICAgICAgICBjYXNlICdnZyc6XG4gICAgICAgIGNhc2UgJ0hIJzpcbiAgICAgICAgY2FzZSAnaGgnOlxuICAgICAgICBjYXNlICdtbSc6XG4gICAgICAgIGNhc2UgJ3NzJzpcbiAgICAgICAgY2FzZSAnd3cnOlxuICAgICAgICBjYXNlICdXVyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gcGFyc2VUb2tlblR3b0RpZ2l0cyA6IHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnTSc6XG4gICAgICAgIGNhc2UgJ0QnOlxuICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgY2FzZSAnSCc6XG4gICAgICAgIGNhc2UgJ2gnOlxuICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgY2FzZSAncyc6XG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICBjYXNlICdXJzpcbiAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cztcbiAgICAgICAgY2FzZSAnRG8nOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PcmRpbmFsO1xuICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgIGEgPSBuZXcgUmVnRXhwKHJlZ2V4cEVzY2FwZSh1bmVzY2FwZUZvcm1hdCh0b2tlbi5yZXBsYWNlKCdcXFxcJywgJycpKSwgXCJpXCIpKTtcbiAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGltZXpvbmVNaW51dGVzRnJvbVN0cmluZyhzdHJpbmcpIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nIHx8IFwiXCI7XG4gICAgICAgIHZhciBwb3NzaWJsZVR6TWF0Y2hlcyA9IChzdHJpbmcubWF0Y2gocGFyc2VUb2tlblRpbWV6b25lKSB8fCBbXSksXG4gICAgICAgICAgICB0ekNodW5rID0gcG9zc2libGVUek1hdGNoZXNbcG9zc2libGVUek1hdGNoZXMubGVuZ3RoIC0gMV0gfHwgW10sXG4gICAgICAgICAgICBwYXJ0cyA9ICh0ekNodW5rICsgJycpLm1hdGNoKHBhcnNlVGltZXpvbmVDaHVua2VyKSB8fCBbJy0nLCAwLCAwXSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSArKHBhcnRzWzFdICogNjApICsgdG9JbnQocGFydHNbMl0pO1xuXG4gICAgICAgIHJldHVybiBwYXJ0c1swXSA9PT0gJysnID8gLW1pbnV0ZXMgOiBtaW51dGVzO1xuICAgIH1cblxuICAgIC8vIGZ1bmN0aW9uIHRvIGNvbnZlcnQgc3RyaW5nIGlucHV0IHRvIGRhdGVcbiAgICBmdW5jdGlvbiBhZGRUaW1lVG9BcnJheUZyb21Ub2tlbih0b2tlbiwgaW5wdXQsIGNvbmZpZykge1xuICAgICAgICB2YXIgYSwgZGF0ZVBhcnRBcnJheSA9IGNvbmZpZy5fYTtcblxuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIC8vIFFVQVJURVJcbiAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gKHRvSW50KGlucHV0KSAtIDEpICogMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNT05USFxuICAgICAgICBjYXNlICdNJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTVxuICAgICAgICBjYXNlICdNTScgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W01PTlRIXSA9IHRvSW50KGlucHV0KSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnTU1NJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBNTU1NXG4gICAgICAgIGNhc2UgJ01NTU0nIDpcbiAgICAgICAgICAgIGEgPSBnZXRMYW5nRGVmaW5pdGlvbihjb25maWcuX2wpLm1vbnRoc1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBmaW5kIGEgbW9udGggbmFtZSwgbWFyayB0aGUgZGF0ZSBhcyBpbnZhbGlkLlxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gYTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkTW9udGggPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEQVkgT0YgTU9OVEhcbiAgICAgICAgY2FzZSAnRCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gRERcbiAgICAgICAgY2FzZSAnREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtEQVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdEbycgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W0RBVEVdID0gdG9JbnQocGFyc2VJbnQoaW5wdXQsIDEwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gREFZIE9GIFlFQVJcbiAgICAgICAgY2FzZSAnREREJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBEREREXG4gICAgICAgIGNhc2UgJ0REREQnIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBZRUFSXG4gICAgICAgIGNhc2UgJ1lZJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1lFQVJdID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZJyA6XG4gICAgICAgIGNhc2UgJ1lZWVlZWScgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtZRUFSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBBTSAvIFBNXG4gICAgICAgIGNhc2UgJ2EnIDogLy8gZmFsbCB0aHJvdWdoIHRvIEFcbiAgICAgICAgY2FzZSAnQScgOlxuICAgICAgICAgICAgY29uZmlnLl9pc1BtID0gZ2V0TGFuZ0RlZmluaXRpb24oY29uZmlnLl9sKS5pc1BNKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyAyNCBIT1VSXG4gICAgICAgIGNhc2UgJ0gnIDogLy8gZmFsbCB0aHJvdWdoIHRvIGhoXG4gICAgICAgIGNhc2UgJ0hIJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBoaFxuICAgICAgICBjYXNlICdoJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBoaFxuICAgICAgICBjYXNlICdoaCcgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtIT1VSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNSU5VVEVcbiAgICAgICAgY2FzZSAnbScgOiAvLyBmYWxsIHRocm91Z2ggdG8gbW1cbiAgICAgICAgY2FzZSAnbW0nIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTUlOVVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBTRUNPTkRcbiAgICAgICAgY2FzZSAncycgOiAvLyBmYWxsIHRocm91Z2ggdG8gc3NcbiAgICAgICAgY2FzZSAnc3MnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbU0VDT05EXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNSUxMSVNFQ09ORFxuICAgICAgICBjYXNlICdTJyA6XG4gICAgICAgIGNhc2UgJ1NTJyA6XG4gICAgICAgIGNhc2UgJ1NTUycgOlxuICAgICAgICBjYXNlICdTU1NTJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTExJU0VDT05EXSA9IHRvSW50KCgnMC4nICsgaW5wdXQpICogMTAwMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gVU5JWCBUSU1FU1RBTVAgV0lUSCBNU1xuICAgICAgICBjYXNlICdYJzpcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKHBhcnNlRmxvYXQoaW5wdXQpICogMTAwMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gVElNRVpPTkVcbiAgICAgICAgY2FzZSAnWicgOiAvLyBmYWxsIHRocm91Z2ggdG8gWlpcbiAgICAgICAgY2FzZSAnWlonIDpcbiAgICAgICAgICAgIGNvbmZpZy5fdXNlVVRDID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpZy5fdHptID0gdGltZXpvbmVNaW51dGVzRnJvbVN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gV0VFS0RBWSAtIGh1bWFuXG4gICAgICAgIGNhc2UgJ2RkJzpcbiAgICAgICAgY2FzZSAnZGRkJzpcbiAgICAgICAgY2FzZSAnZGRkZCc6XG4gICAgICAgICAgICBhID0gZ2V0TGFuZ0RlZmluaXRpb24oY29uZmlnLl9sKS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGRpZG4ndCBnZXQgYSB3ZWVrZGF5IG5hbWUsIG1hcmsgdGhlIGRhdGUgYXMgaW52YWxpZFxuICAgICAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgICAgICBjb25maWcuX3dbJ2QnXSA9IGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZFdlZWtkYXkgPSBpbnB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBXRUVLLCBXRUVLIERBWSAtIG51bWVyaWNcbiAgICAgICAgY2FzZSAndyc6XG4gICAgICAgIGNhc2UgJ3d3JzpcbiAgICAgICAgY2FzZSAnVyc6XG4gICAgICAgIGNhc2UgJ1dXJzpcbiAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgIGNhc2UgJ2UnOlxuICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDEpO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdnZ2dnJzpcbiAgICAgICAgY2FzZSAnR0dHRyc6XG4gICAgICAgIGNhc2UgJ0dHR0dHJzpcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4uc3Vic3RyKDAsIDIpO1xuICAgICAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fd1t0b2tlbl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZ2cnOlxuICAgICAgICBjYXNlICdHRyc6XG4gICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICBjb25maWcuX3dbdG9rZW5dID0gbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyKGlucHV0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpIHtcbiAgICAgICAgdmFyIHcsIHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3csIGRveSwgdGVtcCwgbGFuZztcblxuICAgICAgICB3ID0gY29uZmlnLl93O1xuICAgICAgICBpZiAody5HRyAhPSBudWxsIHx8IHcuVyAhPSBudWxsIHx8IHcuRSAhPSBudWxsKSB7XG4gICAgICAgICAgICBkb3cgPSAxO1xuICAgICAgICAgICAgZG95ID0gNDtcblxuICAgICAgICAgICAgLy8gVE9ETzogV2UgbmVlZCB0byB0YWtlIHRoZSBjdXJyZW50IGlzb1dlZWtZZWFyLCBidXQgdGhhdCBkZXBlbmRzIG9uXG4gICAgICAgICAgICAvLyBob3cgd2UgaW50ZXJwcmV0IG5vdyAobG9jYWwsIHV0YywgZml4ZWQgb2Zmc2V0KS4gU28gY3JlYXRlXG4gICAgICAgICAgICAvLyBhIG5vdyB2ZXJzaW9uIG9mIGN1cnJlbnQgY29uZmlnICh0YWtlIGxvY2FsL3V0Yy9vZmZzZXQgZmxhZ3MsIGFuZFxuICAgICAgICAgICAgLy8gY3JlYXRlIG5vdykuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LkdHLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIDEsIDQpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRmbCh3LlcsIDEpO1xuICAgICAgICAgICAgd2Vla2RheSA9IGRmbCh3LkUsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGFuZyA9IGdldExhbmdEZWZpbml0aW9uKGNvbmZpZy5fbCk7XG4gICAgICAgICAgICBkb3cgPSBsYW5nLl93ZWVrLmRvdztcbiAgICAgICAgICAgIGRveSA9IGxhbmcuX3dlZWsuZG95O1xuXG4gICAgICAgICAgICB3ZWVrWWVhciA9IGRmbCh3LmdnLCBjb25maWcuX2FbWUVBUl0sIHdlZWtPZlllYXIobW9tZW50KCksIGRvdywgZG95KS55ZWFyKTtcbiAgICAgICAgICAgIHdlZWsgPSBkZmwody53LCAxKTtcblxuICAgICAgICAgICAgaWYgKHcuZCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gd2Vla2RheSAtLSBsb3cgZGF5IG51bWJlcnMgYXJlIGNvbnNpZGVyZWQgbmV4dCB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZDtcbiAgICAgICAgICAgICAgICBpZiAod2Vla2RheSA8IGRvdykge1xuICAgICAgICAgICAgICAgICAgICArK3dlZWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh3LmUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIGxvY2FsIHdlZWtkYXkgLS0gY291bnRpbmcgc3RhcnRzIGZyb20gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSB3LmUgKyBkb3c7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gYmVnaW5pbmcgb2Ygd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSBkb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGVtcCA9IGRheU9mWWVhckZyb21XZWVrcyh3ZWVrWWVhciwgd2Vlaywgd2Vla2RheSwgZG95LCBkb3cpO1xuXG4gICAgICAgIGNvbmZpZy5fYVtZRUFSXSA9IHRlbXAueWVhcjtcbiAgICAgICAgY29uZmlnLl9kYXlPZlllYXIgPSB0ZW1wLmRheU9mWWVhcjtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IGFuIGFycmF5IHRvIGEgZGF0ZS5cbiAgICAvLyB0aGUgYXJyYXkgc2hvdWxkIG1pcnJvciB0aGUgcGFyYW1ldGVycyBiZWxvd1xuICAgIC8vIG5vdGU6IGFsbCB2YWx1ZXMgcGFzdCB0aGUgeWVhciBhcmUgb3B0aW9uYWwgYW5kIHdpbGwgZGVmYXVsdCB0byB0aGUgbG93ZXN0IHBvc3NpYmxlIHZhbHVlLlxuICAgIC8vIFt5ZWFyLCBtb250aCwgZGF5ICwgaG91ciwgbWludXRlLCBzZWNvbmQsIG1pbGxpc2Vjb25kXVxuICAgIGZ1bmN0aW9uIGRhdGVGcm9tQ29uZmlnKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgZGF0ZSwgaW5wdXQgPSBbXSwgY3VycmVudERhdGUsIHllYXJUb1VzZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9kKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50RGF0ZSA9IGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKTtcblxuICAgICAgICAvL2NvbXB1dGUgZGF5IG9mIHRoZSB5ZWFyIGZyb20gd2Vla3MgYW5kIHdlZWtkYXlzXG4gICAgICAgIGlmIChjb25maWcuX3cgJiYgY29uZmlnLl9hW0RBVEVdID09IG51bGwgJiYgY29uZmlnLl9hW01PTlRIXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWYgdGhlIGRheSBvZiB0aGUgeWVhciBpcyBzZXQsIGZpZ3VyZSBvdXQgd2hhdCBpdCBpc1xuICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIpIHtcbiAgICAgICAgICAgIHllYXJUb1VzZSA9IGRmbChjb25maWcuX2FbWUVBUl0sIGN1cnJlbnREYXRlW1lFQVJdKTtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZy5fZGF5T2ZZZWFyID4gZGF5c0luWWVhcih5ZWFyVG9Vc2UpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5fb3ZlcmZsb3dEYXlPZlllYXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRlID0gbWFrZVVUQ0RhdGUoeWVhclRvVXNlLCAwLCBjb25maWcuX2RheU9mWWVhcik7XG4gICAgICAgICAgICBjb25maWcuX2FbTU9OVEhdID0gZGF0ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgY29uZmlnLl9hW0RBVEVdID0gZGF0ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZGF0ZS5cbiAgICAgICAgLy8gKiBpZiBubyB5ZWFyLCBtb250aCwgZGF5IG9mIG1vbnRoIGFyZSBnaXZlbiwgZGVmYXVsdCB0byB0b2RheVxuICAgICAgICAvLyAqIGlmIGRheSBvZiBtb250aCBpcyBnaXZlbiwgZGVmYXVsdCBtb250aCBhbmQgeWVhclxuICAgICAgICAvLyAqIGlmIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG9ubHkgeWVhclxuICAgICAgICAvLyAqIGlmIHllYXIgaXMgZ2l2ZW4sIGRvbid0IGRlZmF1bHQgYW55dGhpbmdcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IDMgJiYgY29uZmlnLl9hW2ldID09IG51bGw7ICsraSkge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSBjdXJyZW50RGF0ZVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFplcm8gb3V0IHdoYXRldmVyIHdhcyBub3QgZGVmYXVsdGVkLCBpbmNsdWRpbmcgdGltZVxuICAgICAgICBmb3IgKDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uZmlnLl9hW2ldID0gaW5wdXRbaV0gPSAoY29uZmlnLl9hW2ldID09IG51bGwpID8gKGkgPT09IDIgPyAxIDogMCkgOiBjb25maWcuX2FbaV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2QgPSAoY29uZmlnLl91c2VVVEMgPyBtYWtlVVRDRGF0ZSA6IG1ha2VEYXRlKS5hcHBseShudWxsLCBpbnB1dCk7XG4gICAgICAgIC8vIEFwcGx5IHRpbWV6b25lIG9mZnNldCBmcm9tIGlucHV0LiBUaGUgYWN0dWFsIHpvbmUgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgLy8gd2l0aCBwYXJzZVpvbmUuXG4gICAgICAgIGlmIChjb25maWcuX3R6bSAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb25maWcuX2Quc2V0VVRDTWludXRlcyhjb25maWcuX2QuZ2V0VVRDTWludXRlcygpICsgY29uZmlnLl90em0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF0ZUZyb21PYmplY3QoY29uZmlnKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQ7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9ybWFsaXplZElucHV0ID0gbm9ybWFsaXplT2JqZWN0VW5pdHMoY29uZmlnLl9pKTtcbiAgICAgICAgY29uZmlnLl9hID0gW1xuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LnllYXIsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubW9udGgsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQuZGF5LFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LmhvdXIsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubWludXRlLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LnNlY29uZCxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZFxuICAgICAgICBdO1xuXG4gICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3VycmVudERhdGVBcnJheShjb25maWcpIHtcbiAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGlmIChjb25maWcuX3VzZVVUQykge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDRnVsbFllYXIoKSxcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDTW9udGgoKSxcbiAgICAgICAgICAgICAgICBub3cuZ2V0VVRDRGF0ZSgpXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIHN0cmluZyBhbmQgZm9ybWF0IHN0cmluZ1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdChjb25maWcpIHtcblxuICAgICAgICBpZiAoY29uZmlnLl9mID09PSBtb21lbnQuSVNPXzg2MDEpIHtcbiAgICAgICAgICAgIHBhcnNlSVNPKGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2EgPSBbXTtcbiAgICAgICAgY29uZmlnLl9wZi5lbXB0eSA9IHRydWU7XG5cbiAgICAgICAgLy8gVGhpcyBhcnJheSBpcyB1c2VkIHRvIG1ha2UgYSBEYXRlLCBlaXRoZXIgd2l0aCBgbmV3IERhdGVgIG9yIGBEYXRlLlVUQ2BcbiAgICAgICAgdmFyIGxhbmcgPSBnZXRMYW5nRGVmaW5pdGlvbihjb25maWcuX2wpLFxuICAgICAgICAgICAgc3RyaW5nID0gJycgKyBjb25maWcuX2ksXG4gICAgICAgICAgICBpLCBwYXJzZWRJbnB1dCwgdG9rZW5zLCB0b2tlbiwgc2tpcHBlZCxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgICAgICB0b3RhbFBhcnNlZElucHV0TGVuZ3RoID0gMDtcblxuICAgICAgICB0b2tlbnMgPSBleHBhbmRGb3JtYXQoY29uZmlnLl9mLCBsYW5nKS5tYXRjaChmb3JtYXR0aW5nVG9rZW5zKSB8fCBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgICAgICAgIHBhcnNlZElucHV0ID0gKHN0cmluZy5tYXRjaChnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4odG9rZW4sIGNvbmZpZykpIHx8IFtdKVswXTtcbiAgICAgICAgICAgIGlmIChwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgIHNraXBwZWQgPSBzdHJpbmcuc3Vic3RyKDAsIHN0cmluZy5pbmRleE9mKHBhcnNlZElucHV0KSk7XG4gICAgICAgICAgICAgICAgaWYgKHNraXBwZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZElucHV0LnB1c2goc2tpcHBlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0cmluZyA9IHN0cmluZy5zbGljZShzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkgKyBwYXJzZWRJbnB1dC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGggKz0gcGFyc2VkSW5wdXQubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZG9uJ3QgcGFyc2UgaWYgaXQncyBub3QgYSBrbm93biB0b2tlblxuICAgICAgICAgICAgaWYgKGZvcm1hdFRva2VuRnVuY3Rpb25zW3Rva2VuXSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLmVtcHR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX3BmLnVudXNlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWRkVGltZVRvQXJyYXlGcm9tVG9rZW4odG9rZW4sIHBhcnNlZElucHV0LCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY29uZmlnLl9zdHJpY3QgJiYgIXBhcnNlZElucHV0KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgcmVtYWluaW5nIHVucGFyc2VkIGlucHV0IGxlbmd0aCB0byB0aGUgc3RyaW5nXG4gICAgICAgIGNvbmZpZy5fcGYuY2hhcnNMZWZ0T3ZlciA9IHN0cmluZ0xlbmd0aCAtIHRvdGFsUGFyc2VkSW5wdXRMZW5ndGg7XG4gICAgICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRJbnB1dC5wdXNoKHN0cmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBoYW5kbGUgYW0gcG1cbiAgICAgICAgaWYgKGNvbmZpZy5faXNQbSAmJiBjb25maWcuX2FbSE9VUl0gPCAxMikge1xuICAgICAgICAgICAgY29uZmlnLl9hW0hPVVJdICs9IDEyO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIGlzIDEyIGFtLCBjaGFuZ2UgaG91cnMgdG8gMFxuICAgICAgICBpZiAoY29uZmlnLl9pc1BtID09PSBmYWxzZSAmJiBjb25maWcuX2FbSE9VUl0gPT09IDEyKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICAgICAgY2hlY2tPdmVyZmxvdyhjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuZXNjYXBlRm9ybWF0KHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFxcXChcXFspfFxcXFwoXFxdKXxcXFsoW15cXF1cXFtdKilcXF18XFxcXCguKS9nLCBmdW5jdGlvbiAobWF0Y2hlZCwgcDEsIHAyLCBwMywgcDQpIHtcbiAgICAgICAgICAgIHJldHVybiBwMSB8fCBwMiB8fCBwMyB8fCBwNDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ29kZSBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzU2MTQ5My9pcy10aGVyZS1hLXJlZ2V4cC1lc2NhcGUtZnVuY3Rpb24taW4tamF2YXNjcmlwdFxuICAgIGZ1bmN0aW9uIHJlZ2V4cEVzY2FwZShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBzdHJpbmcgYW5kIGFycmF5IG9mIGZvcm1hdCBzdHJpbmdzXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKSB7XG4gICAgICAgIHZhciB0ZW1wQ29uZmlnLFxuICAgICAgICAgICAgYmVzdE1vbWVudCxcblxuICAgICAgICAgICAgc2NvcmVUb0JlYXQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgY3VycmVudFNjb3JlO1xuXG4gICAgICAgIGlmIChjb25maWcuX2YubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmludmFsaWRGb3JtYXQgPSB0cnVlO1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoTmFOKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb25maWcuX2YubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSA9IDA7XG4gICAgICAgICAgICB0ZW1wQ29uZmlnID0gZXh0ZW5kKHt9LCBjb25maWcpO1xuICAgICAgICAgICAgdGVtcENvbmZpZy5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG4gICAgICAgICAgICB0ZW1wQ29uZmlnLl9mID0gY29uZmlnLl9mW2ldO1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KHRlbXBDb25maWcpO1xuXG4gICAgICAgICAgICBpZiAoIWlzVmFsaWQodGVtcENvbmZpZykpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYW55IGlucHV0IHRoYXQgd2FzIG5vdCBwYXJzZWQgYWRkIGEgcGVuYWx0eSBmb3IgdGhhdCBmb3JtYXRcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSArPSB0ZW1wQ29uZmlnLl9wZi5jaGFyc0xlZnRPdmVyO1xuXG4gICAgICAgICAgICAvL29yIHRva2Vuc1xuICAgICAgICAgICAgY3VycmVudFNjb3JlICs9IHRlbXBDb25maWcuX3BmLnVudXNlZFRva2Vucy5sZW5ndGggKiAxMDtcblxuICAgICAgICAgICAgdGVtcENvbmZpZy5fcGYuc2NvcmUgPSBjdXJyZW50U2NvcmU7XG5cbiAgICAgICAgICAgIGlmIChzY29yZVRvQmVhdCA9PSBudWxsIHx8IGN1cnJlbnRTY29yZSA8IHNjb3JlVG9CZWF0KSB7XG4gICAgICAgICAgICAgICAgc2NvcmVUb0JlYXQgPSBjdXJyZW50U2NvcmU7XG4gICAgICAgICAgICAgICAgYmVzdE1vbWVudCA9IHRlbXBDb25maWc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbmQoY29uZmlnLCBiZXN0TW9tZW50IHx8IHRlbXBDb25maWcpO1xuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBpc28gZm9ybWF0XG4gICAgZnVuY3Rpb24gcGFyc2VJU08oY29uZmlnKSB7XG4gICAgICAgIHZhciBpLCBsLFxuICAgICAgICAgICAgc3RyaW5nID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgbWF0Y2ggPSBpc29SZWdleC5leGVjKHN0cmluZyk7XG5cbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmlzbyA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXNvRGF0ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzb0RhdGVzW2ldWzFdLmV4ZWMoc3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaFs1XSBzaG91bGQgYmUgXCJUXCIgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiA9IGlzb0RhdGVzW2ldWzBdICsgKG1hdGNoWzZdIHx8IFwiIFwiKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb1RpbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29UaW1lc1tpXVsxXS5leGVjKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9mICs9IGlzb1RpbWVzW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RyaW5nLm1hdGNoKHBhcnNlVG9rZW5UaW1lem9uZSkpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX2YgKz0gXCJaXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpZy5faXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIGlzbyBmb3JtYXQgb3IgZmFsbGJhY2tcbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21TdHJpbmcoY29uZmlnKSB7XG4gICAgICAgIHBhcnNlSVNPKGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcuX2lzVmFsaWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgY29uZmlnLl9pc1ZhbGlkO1xuICAgICAgICAgICAgbW9tZW50LmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrKGNvbmZpZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21JbnB1dChjb25maWcpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgbWF0Y2hlZCA9IGFzcE5ldEpzb25SZWdleC5leGVjKGlucHV0KTtcblxuICAgICAgICBpZiAoaW5wdXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaGVkKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgrbWF0Y2hlZFsxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYSA9IGlucHV0LnNsaWNlKDApO1xuICAgICAgICAgICAgZGF0ZUZyb21Db25maWcoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RhdGUoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSgraW5wdXQpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZihpbnB1dCkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkYXRlRnJvbU9iamVjdChjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZihpbnB1dCkgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAvLyBmcm9tIG1pbGxpc2Vjb25kc1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoaW5wdXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbW9tZW50LmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrKGNvbmZpZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlRGF0ZSh5LCBtLCBkLCBoLCBNLCBzLCBtcykge1xuICAgICAgICAvL2Nhbid0IGp1c3QgYXBwbHkoKSB0byBjcmVhdGUgYSBkYXRlOlxuICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTgxMzQ4L2luc3RhbnRpYXRpbmctYS1qYXZhc2NyaXB0LW9iamVjdC1ieS1jYWxsaW5nLXByb3RvdHlwZS1jb25zdHJ1Y3Rvci1hcHBseVxuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHksIG0sIGQsIGgsIE0sIHMsIG1zKTtcblxuICAgICAgICAvL3RoZSBkYXRlIGNvbnN0cnVjdG9yIGRvZXNuJ3QgYWNjZXB0IHllYXJzIDwgMTk3MFxuICAgICAgICBpZiAoeSA8IDE5NzApIHtcbiAgICAgICAgICAgIGRhdGUuc2V0RnVsbFllYXIoeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZVVUQ0RhdGUoeSkge1xuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuICAgICAgICBpZiAoeSA8IDE5NzApIHtcbiAgICAgICAgICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VXZWVrZGF5KGlucHV0LCBsYW5ndWFnZSkge1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKCFpc05hTihpbnB1dCkpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IHBhcnNlSW50KGlucHV0LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IGxhbmd1YWdlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBSZWxhdGl2ZSBUaW1lXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBoZWxwZXIgZnVuY3Rpb24gZm9yIG1vbWVudC5mbi5mcm9tLCBtb21lbnQuZm4uZnJvbU5vdywgYW5kIG1vbWVudC5kdXJhdGlvbi5mbi5odW1hbml6ZVxuICAgIGZ1bmN0aW9uIHN1YnN0aXR1dGVUaW1lQWdvKHN0cmluZywgbnVtYmVyLCB3aXRob3V0U3VmZml4LCBpc0Z1dHVyZSwgbGFuZykge1xuICAgICAgICByZXR1cm4gbGFuZy5yZWxhdGl2ZVRpbWUobnVtYmVyIHx8IDEsICEhd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVsYXRpdmVUaW1lKG1pbGxpc2Vjb25kcywgd2l0aG91dFN1ZmZpeCwgbGFuZykge1xuICAgICAgICB2YXIgc2Vjb25kcyA9IHJvdW5kKE1hdGguYWJzKG1pbGxpc2Vjb25kcykgLyAxMDAwKSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSByb3VuZChzZWNvbmRzIC8gNjApLFxuICAgICAgICAgICAgaG91cnMgPSByb3VuZChtaW51dGVzIC8gNjApLFxuICAgICAgICAgICAgZGF5cyA9IHJvdW5kKGhvdXJzIC8gMjQpLFxuICAgICAgICAgICAgeWVhcnMgPSByb3VuZChkYXlzIC8gMzY1KSxcbiAgICAgICAgICAgIGFyZ3MgPSBzZWNvbmRzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5zICAmJiBbJ3MnLCBzZWNvbmRzXSB8fFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPT09IDEgJiYgWydtJ10gfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5tICYmIFsnbW0nLCBtaW51dGVzXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzID09PSAxICYmIFsnaCddIHx8XG4gICAgICAgICAgICAgICAgaG91cnMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmggJiYgWydoaCcsIGhvdXJzXSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPT09IDEgJiYgWydkJ10gfHxcbiAgICAgICAgICAgICAgICBkYXlzIDw9IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuZGQgJiYgWydkZCcsIGRheXNdIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA8PSByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmRtICYmIFsnTSddIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuZHkgJiYgWydNTScsIHJvdW5kKGRheXMgLyAzMCldIHx8XG4gICAgICAgICAgICAgICAgeWVhcnMgPT09IDEgJiYgWyd5J10gfHwgWyd5eScsIHllYXJzXTtcbiAgICAgICAgYXJnc1syXSA9IHdpdGhvdXRTdWZmaXg7XG4gICAgICAgIGFyZ3NbM10gPSBtaWxsaXNlY29uZHMgPiAwO1xuICAgICAgICBhcmdzWzRdID0gbGFuZztcbiAgICAgICAgcmV0dXJuIHN1YnN0aXR1dGVUaW1lQWdvLmFwcGx5KHt9LCBhcmdzKTtcbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgV2VlayBvZiBZZWFyXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBmaXJzdERheU9mV2VlayAgICAgICAwID0gc3VuLCA2ID0gc2F0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGRheSBvZiB0aGUgd2VlayB0aGF0IHN0YXJ0cyB0aGUgd2Vla1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICh1c3VhbGx5IHN1bmRheSBvciBtb25kYXkpXG4gICAgLy8gZmlyc3REYXlPZldlZWtPZlllYXIgMCA9IHN1biwgNiA9IHNhdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBmaXJzdCB3ZWVrIGlzIHRoZSB3ZWVrIHRoYXQgY29udGFpbnMgdGhlIGZpcnN0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgb2YgdGhpcyBkYXkgb2YgdGhlIHdlZWtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAoZWcuIElTTyB3ZWVrcyB1c2UgdGh1cnNkYXkgKDQpKVxuICAgIGZ1bmN0aW9uIHdlZWtPZlllYXIobW9tLCBmaXJzdERheU9mV2VlaywgZmlyc3REYXlPZldlZWtPZlllYXIpIHtcbiAgICAgICAgdmFyIGVuZCA9IGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIC0gZmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICBkYXlzVG9EYXlPZldlZWsgPSBmaXJzdERheU9mV2Vla09mWWVhciAtIG1vbS5kYXkoKSxcbiAgICAgICAgICAgIGFkanVzdGVkTW9tZW50O1xuXG5cbiAgICAgICAgaWYgKGRheXNUb0RheU9mV2VlayA+IGVuZCkge1xuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrIC09IDc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF5c1RvRGF5T2ZXZWVrIDwgZW5kIC0gNykge1xuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrICs9IDc7XG4gICAgICAgIH1cblxuICAgICAgICBhZGp1c3RlZE1vbWVudCA9IG1vbWVudChtb20pLmFkZCgnZCcsIGRheXNUb0RheU9mV2Vlayk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3ZWVrOiBNYXRoLmNlaWwoYWRqdXN0ZWRNb21lbnQuZGF5T2ZZZWFyKCkgLyA3KSxcbiAgICAgICAgICAgIHllYXI6IGFkanVzdGVkTW9tZW50LnllYXIoKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9JU09fd2Vla19kYXRlI0NhbGN1bGF0aW5nX2FfZGF0ZV9naXZlbl90aGVfeWVhci4yQ193ZWVrX251bWJlcl9hbmRfd2Vla2RheVxuICAgIGZ1bmN0aW9uIGRheU9mWWVhckZyb21XZWVrcyh5ZWFyLCB3ZWVrLCB3ZWVrZGF5LCBmaXJzdERheU9mV2Vla09mWWVhciwgZmlyc3REYXlPZldlZWspIHtcbiAgICAgICAgdmFyIGQgPSBtYWtlVVRDRGF0ZSh5ZWFyLCAwLCAxKS5nZXRVVENEYXkoKSwgZGF5c1RvQWRkLCBkYXlPZlllYXI7XG5cbiAgICAgICAgZCA9IGQgPT09IDAgPyA3IDogZDtcbiAgICAgICAgd2Vla2RheSA9IHdlZWtkYXkgIT0gbnVsbCA/IHdlZWtkYXkgOiBmaXJzdERheU9mV2VlaztcbiAgICAgICAgZGF5c1RvQWRkID0gZmlyc3REYXlPZldlZWsgLSBkICsgKGQgPiBmaXJzdERheU9mV2Vla09mWWVhciA/IDcgOiAwKSAtIChkIDwgZmlyc3REYXlPZldlZWsgPyA3IDogMCk7XG4gICAgICAgIGRheU9mWWVhciA9IDcgKiAod2VlayAtIDEpICsgKHdlZWtkYXkgLSBmaXJzdERheU9mV2VlaykgKyBkYXlzVG9BZGQgKyAxO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB5ZWFyOiBkYXlPZlllYXIgPiAwID8geWVhciA6IHllYXIgLSAxLFxuICAgICAgICAgICAgZGF5T2ZZZWFyOiBkYXlPZlllYXIgPiAwID8gIGRheU9mWWVhciA6IGRheXNJblllYXIoeWVhciAtIDEpICsgZGF5T2ZZZWFyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBUb3AgTGV2ZWwgRnVuY3Rpb25zXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZU1vbWVudChjb25maWcpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgZm9ybWF0ID0gY29uZmlnLl9mO1xuXG4gICAgICAgIGlmIChpbnB1dCA9PT0gbnVsbCB8fCAoZm9ybWF0ID09PSB1bmRlZmluZWQgJiYgaW5wdXQgPT09ICcnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5pbnZhbGlkKHtudWxsSW5wdXQ6IHRydWV9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25maWcuX2kgPSBpbnB1dCA9IGdldExhbmdEZWZpbml0aW9uKCkucHJlcGFyc2UoaW5wdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc01vbWVudChpbnB1dCkpIHtcbiAgICAgICAgICAgIGNvbmZpZyA9IGNsb25lTW9tZW50KGlucHV0KTtcblxuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK2lucHV0Ll9kKTtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtYXQpIHtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KGZvcm1hdCkpIHtcbiAgICAgICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRBcnJheShjb25maWcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbUlucHV0KGNvbmZpZyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IE1vbWVudChjb25maWcpO1xuICAgIH1cblxuICAgIG1vbWVudCA9IGZ1bmN0aW9uIChpbnB1dCwgZm9ybWF0LCBsYW5nLCBzdHJpY3QpIHtcbiAgICAgICAgdmFyIGM7XG5cbiAgICAgICAgaWYgKHR5cGVvZihsYW5nKSA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAgICAgICAgIHN0cmljdCA9IGxhbmc7XG4gICAgICAgICAgICBsYW5nID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIG9iamVjdCBjb25zdHJ1Y3Rpb24gbXVzdCBiZSBkb25lIHRoaXMgd2F5LlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQyM1xuICAgICAgICBjID0ge307XG4gICAgICAgIGMuX2lzQU1vbWVudE9iamVjdCA9IHRydWU7XG4gICAgICAgIGMuX2kgPSBpbnB1dDtcbiAgICAgICAgYy5fZiA9IGZvcm1hdDtcbiAgICAgICAgYy5fbCA9IGxhbmc7XG4gICAgICAgIGMuX3N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYy5faXNVVEMgPSBmYWxzZTtcbiAgICAgICAgYy5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG5cbiAgICAgICAgcmV0dXJuIG1ha2VNb21lbnQoYyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MgPSBmYWxzZTtcblxuICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayA9IGRlcHJlY2F0ZShcbiAgICAgICAgICAgIFwibW9tZW50IGNvbnN0cnVjdGlvbiBmYWxscyBiYWNrIHRvIGpzIERhdGUuIFRoaXMgaXMgXCIgK1xuICAgICAgICAgICAgXCJkaXNjb3VyYWdlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHVwY29taW5nIG1ham9yIFwiICtcbiAgICAgICAgICAgIFwicmVsZWFzZS4gUGxlYXNlIHJlZmVyIHRvIFwiICtcbiAgICAgICAgICAgIFwiaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MDcgZm9yIG1vcmUgaW5mby5cIixcbiAgICAgICAgICAgIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoY29uZmlnLl9pKTtcbiAgICB9KTtcblxuICAgIC8vIFBpY2sgYSBtb21lbnQgbSBmcm9tIG1vbWVudHMgc28gdGhhdCBtW2ZuXShvdGhlcikgaXMgdHJ1ZSBmb3IgYWxsXG4gICAgLy8gb3RoZXIuIFRoaXMgcmVsaWVzIG9uIHRoZSBmdW5jdGlvbiBmbiB0byBiZSB0cmFuc2l0aXZlLlxuICAgIC8vXG4gICAgLy8gbW9tZW50cyBzaG91bGQgZWl0aGVyIGJlIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzIG9yIGFuIGFycmF5LCB3aG9zZVxuICAgIC8vIGZpcnN0IGVsZW1lbnQgaXMgYW4gYXJyYXkgb2YgbW9tZW50IG9iamVjdHMuXG4gICAgZnVuY3Rpb24gcGlja0J5KGZuLCBtb21lbnRzKSB7XG4gICAgICAgIHZhciByZXMsIGk7XG4gICAgICAgIGlmIChtb21lbnRzLmxlbmd0aCA9PT0gMSAmJiBpc0FycmF5KG1vbWVudHNbMF0pKSB7XG4gICAgICAgICAgICBtb21lbnRzID0gbW9tZW50c1swXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1vbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gbW9tZW50c1swXTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IG1vbWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChtb21lbnRzW2ldW2ZuXShyZXMpKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gbW9tZW50c1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIG1vbWVudC5taW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQmVmb3JlJywgYXJncyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5tYXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICAgIHJldHVybiBwaWNrQnkoJ2lzQWZ0ZXInLCBhcmdzKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRpbmcgd2l0aCB1dGNcbiAgICBtb21lbnQudXRjID0gZnVuY3Rpb24gKGlucHV0LCBmb3JtYXQsIGxhbmcsIHN0cmljdCkge1xuICAgICAgICB2YXIgYztcblxuICAgICAgICBpZiAodHlwZW9mKGxhbmcpID09PSBcImJvb2xlYW5cIikge1xuICAgICAgICAgICAgc3RyaWN0ID0gbGFuZztcbiAgICAgICAgICAgIGxhbmcgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gb2JqZWN0IGNvbnN0cnVjdGlvbiBtdXN0IGJlIGRvbmUgdGhpcyB3YXkuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDIzXG4gICAgICAgIGMgPSB7fTtcbiAgICAgICAgYy5faXNBTW9tZW50T2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgYy5fdXNlVVRDID0gdHJ1ZTtcbiAgICAgICAgYy5faXNVVEMgPSB0cnVlO1xuICAgICAgICBjLl9sID0gbGFuZztcbiAgICAgICAgYy5faSA9IGlucHV0O1xuICAgICAgICBjLl9mID0gZm9ybWF0O1xuICAgICAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGMuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuXG4gICAgICAgIHJldHVybiBtYWtlTW9tZW50KGMpLnV0YygpO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGluZyB3aXRoIHVuaXggdGltZXN0YW1wIChpbiBzZWNvbmRzKVxuICAgIG1vbWVudC51bml4ID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBtb21lbnQoaW5wdXQgKiAxMDAwKTtcbiAgICB9O1xuXG4gICAgLy8gZHVyYXRpb25cbiAgICBtb21lbnQuZHVyYXRpb24gPSBmdW5jdGlvbiAoaW5wdXQsIGtleSkge1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBpbnB1dCxcbiAgICAgICAgICAgIC8vIG1hdGNoaW5nIGFnYWluc3QgcmVnZXhwIGlzIGV4cGVuc2l2ZSwgZG8gaXQgb24gZGVtYW5kXG4gICAgICAgICAgICBtYXRjaCA9IG51bGwsXG4gICAgICAgICAgICBzaWduLFxuICAgICAgICAgICAgcmV0LFxuICAgICAgICAgICAgcGFyc2VJc287XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0KSkge1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgbXM6IGlucHV0Ll9taWxsaXNlY29uZHMsXG4gICAgICAgICAgICAgICAgZDogaW5wdXQuX2RheXMsXG4gICAgICAgICAgICAgICAgTTogaW5wdXQuX21vbnRoc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uW2tleV0gPSBpbnB1dDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHVyYXRpb24ubWlsbGlzZWNvbmRzID0gaW5wdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoISEobWF0Y2ggPSBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09IFwiLVwiKSA/IC0xIDogMTtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgICAgZDogdG9JbnQobWF0Y2hbREFURV0pICogc2lnbixcbiAgICAgICAgICAgICAgICBoOiB0b0ludChtYXRjaFtIT1VSXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIG06IHRvSW50KG1hdGNoW01JTlVURV0pICogc2lnbixcbiAgICAgICAgICAgICAgICBzOiB0b0ludChtYXRjaFtTRUNPTkRdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgbXM6IHRvSW50KG1hdGNoW01JTExJU0VDT05EXSkgKiBzaWduXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gaXNvRHVyYXRpb25SZWdleC5leGVjKGlucHV0KSkpIHtcbiAgICAgICAgICAgIHNpZ24gPSAobWF0Y2hbMV0gPT09IFwiLVwiKSA/IC0xIDogMTtcbiAgICAgICAgICAgIHBhcnNlSXNvID0gZnVuY3Rpb24gKGlucCkge1xuICAgICAgICAgICAgICAgIC8vIFdlJ2Qgbm9ybWFsbHkgdXNlIH5+aW5wIGZvciB0aGlzLCBidXQgdW5mb3J0dW5hdGVseSBpdCBhbHNvXG4gICAgICAgICAgICAgICAgLy8gY29udmVydHMgZmxvYXRzIHRvIGludHMuXG4gICAgICAgICAgICAgICAgLy8gaW5wIG1heSBiZSB1bmRlZmluZWQsIHNvIGNhcmVmdWwgY2FsbGluZyByZXBsYWNlIG9uIGl0LlxuICAgICAgICAgICAgICAgIHZhciByZXMgPSBpbnAgJiYgcGFyc2VGbG9hdChpbnAucmVwbGFjZSgnLCcsICcuJykpO1xuICAgICAgICAgICAgICAgIC8vIGFwcGx5IHNpZ24gd2hpbGUgd2UncmUgYXQgaXRcbiAgICAgICAgICAgICAgICByZXR1cm4gKGlzTmFOKHJlcykgPyAwIDogcmVzKSAqIHNpZ247XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgeTogcGFyc2VJc28obWF0Y2hbMl0pLFxuICAgICAgICAgICAgICAgIE06IHBhcnNlSXNvKG1hdGNoWzNdKSxcbiAgICAgICAgICAgICAgICBkOiBwYXJzZUlzbyhtYXRjaFs0XSksXG4gICAgICAgICAgICAgICAgaDogcGFyc2VJc28obWF0Y2hbNV0pLFxuICAgICAgICAgICAgICAgIG06IHBhcnNlSXNvKG1hdGNoWzZdKSxcbiAgICAgICAgICAgICAgICBzOiBwYXJzZUlzbyhtYXRjaFs3XSksXG4gICAgICAgICAgICAgICAgdzogcGFyc2VJc28obWF0Y2hbOF0pXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0ID0gbmV3IER1cmF0aW9uKGR1cmF0aW9uKTtcblxuICAgICAgICBpZiAobW9tZW50LmlzRHVyYXRpb24oaW5wdXQpICYmIGlucHV0Lmhhc093blByb3BlcnR5KCdfbGFuZycpKSB7XG4gICAgICAgICAgICByZXQuX2xhbmcgPSBpbnB1dC5fbGFuZztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIC8vIHZlcnNpb24gbnVtYmVyXG4gICAgbW9tZW50LnZlcnNpb24gPSBWRVJTSU9OO1xuXG4gICAgLy8gZGVmYXVsdCBmb3JtYXRcbiAgICBtb21lbnQuZGVmYXVsdEZvcm1hdCA9IGlzb0Zvcm1hdDtcblxuICAgIC8vIGNvbnN0YW50IHRoYXQgcmVmZXJzIHRvIHRoZSBJU08gc3RhbmRhcmRcbiAgICBtb21lbnQuSVNPXzg2MDEgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIFBsdWdpbnMgdGhhdCBhZGQgcHJvcGVydGllcyBzaG91bGQgYWxzbyBhZGQgdGhlIGtleSBoZXJlIChudWxsIHZhbHVlKSxcbiAgICAvLyBzbyB3ZSBjYW4gcHJvcGVybHkgY2xvbmUgb3Vyc2VsdmVzLlxuICAgIG1vbWVudC5tb21lbnRQcm9wZXJ0aWVzID0gbW9tZW50UHJvcGVydGllcztcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbmV2ZXIgYSBtb21lbnQgaXMgbXV0YXRlZC5cbiAgICAvLyBJdCBpcyBpbnRlbmRlZCB0byBrZWVwIHRoZSBvZmZzZXQgaW4gc3luYyB3aXRoIHRoZSB0aW1lem9uZS5cbiAgICBtb21lbnQudXBkYXRlT2Zmc2V0ID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGFsbG93cyB5b3UgdG8gc2V0IGEgdGhyZXNob2xkIGZvciByZWxhdGl2ZSB0aW1lIHN0cmluZ3NcbiAgICBtb21lbnQucmVsYXRpdmVUaW1lVGhyZXNob2xkID0gZnVuY3Rpb24odGhyZXNob2xkLCBsaW1pdCkge1xuICAgICAgaWYgKHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXSA9IGxpbWl0O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gd2lsbCBsb2FkIGxhbmd1YWdlcyBhbmQgdGhlbiBzZXQgdGhlIGdsb2JhbCBsYW5ndWFnZS4gIElmXG4gICAgLy8gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWQgaW4sIGl0IHdpbGwgc2ltcGx5IHJldHVybiB0aGUgY3VycmVudCBnbG9iYWxcbiAgICAvLyBsYW5ndWFnZSBrZXkuXG4gICAgbW9tZW50LmxhbmcgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZXMpIHtcbiAgICAgICAgdmFyIHI7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmZuLl9sYW5nLl9hYmJyO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIGxvYWRMYW5nKG5vcm1hbGl6ZUxhbmd1YWdlKGtleSksIHZhbHVlcyk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVzID09PSBudWxsKSB7XG4gICAgICAgICAgICB1bmxvYWRMYW5nKGtleSk7XG4gICAgICAgICAgICBrZXkgPSAnZW4nO1xuICAgICAgICB9IGVsc2UgaWYgKCFsYW5ndWFnZXNba2V5XSkge1xuICAgICAgICAgICAgZ2V0TGFuZ0RlZmluaXRpb24oa2V5KTtcbiAgICAgICAgfVxuICAgICAgICByID0gbW9tZW50LmR1cmF0aW9uLmZuLl9sYW5nID0gbW9tZW50LmZuLl9sYW5nID0gZ2V0TGFuZ0RlZmluaXRpb24oa2V5KTtcbiAgICAgICAgcmV0dXJuIHIuX2FiYnI7XG4gICAgfTtcblxuICAgIC8vIHJldHVybnMgbGFuZ3VhZ2UgZGF0YVxuICAgIG1vbWVudC5sYW5nRGF0YSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKGtleSAmJiBrZXkuX2xhbmcgJiYga2V5Ll9sYW5nLl9hYmJyKSB7XG4gICAgICAgICAgICBrZXkgPSBrZXkuX2xhbmcuX2FiYnI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGdldExhbmdEZWZpbml0aW9uKGtleSk7XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUgbW9tZW50IG9iamVjdFxuICAgIG1vbWVudC5pc01vbWVudCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIE1vbWVudCB8fFxuICAgICAgICAgICAgKG9iaiAhPSBudWxsICYmICBvYmouaGFzT3duUHJvcGVydHkoJ19pc0FNb21lbnRPYmplY3QnKSk7XG4gICAgfTtcblxuICAgIC8vIGZvciB0eXBlY2hlY2tpbmcgRHVyYXRpb24gb2JqZWN0c1xuICAgIG1vbWVudC5pc0R1cmF0aW9uID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRHVyYXRpb247XG4gICAgfTtcblxuICAgIGZvciAoaSA9IGxpc3RzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIG1ha2VMaXN0KGxpc3RzW2ldKTtcbiAgICB9XG5cbiAgICBtb21lbnQubm9ybWFsaXplVW5pdHMgPSBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LmludmFsaWQgPSBmdW5jdGlvbiAoZmxhZ3MpIHtcbiAgICAgICAgdmFyIG0gPSBtb21lbnQudXRjKE5hTik7XG4gICAgICAgIGlmIChmbGFncyAhPSBudWxsKSB7XG4gICAgICAgICAgICBleHRlbmQobS5fcGYsIGZsYWdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG0uX3BmLnVzZXJJbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnBhcnNlWm9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpLnBhcnNlWm9uZSgpO1xuICAgIH07XG5cbiAgICBtb21lbnQucGFyc2VUd29EaWdpdFllYXIgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHRvSW50KGlucHV0KSArICh0b0ludChpbnB1dCkgPiA2OCA/IDE5MDAgOiAyMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBNb21lbnQgUHJvdG90eXBlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBleHRlbmQobW9tZW50LmZuID0gTW9tZW50LnByb3RvdHlwZSwge1xuXG4gICAgICAgIGNsb25lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB2YWx1ZU9mIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLl9kICsgKCh0aGlzLl9vZmZzZXQgfHwgMCkgKiA2MDAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5peCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCt0aGlzIC8gMTAwMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jbG9uZSgpLmxhbmcoJ2VuJykuZm9ybWF0KFwiZGRkIE1NTSBERCBZWVlZIEhIOm1tOnNzIFtHTVRdWlpcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9EYXRlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29mZnNldCA/IG5ldyBEYXRlKCt0aGlzKSA6IHRoaXMuX2Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9JU09TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IG1vbWVudCh0aGlzKS51dGMoKTtcbiAgICAgICAgICAgIGlmICgwIDwgbS55ZWFyKCkgJiYgbS55ZWFyKCkgPD0gOTk5OSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgJ1lZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdE1vbWVudChtLCAnWVlZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9BcnJheSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgbS55ZWFyKCksXG4gICAgICAgICAgICAgICAgbS5tb250aCgpLFxuICAgICAgICAgICAgICAgIG0uZGF0ZSgpLFxuICAgICAgICAgICAgICAgIG0uaG91cnMoKSxcbiAgICAgICAgICAgICAgICBtLm1pbnV0ZXMoKSxcbiAgICAgICAgICAgICAgICBtLnNlY29uZHMoKSxcbiAgICAgICAgICAgICAgICBtLm1pbGxpc2Vjb25kcygpXG4gICAgICAgICAgICBdO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzVmFsaWQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNWYWxpZCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0RTVFNoaWZ0ZWQgOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9hKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNWYWxpZCgpICYmIGNvbXBhcmVBcnJheXModGhpcy5fYSwgKHRoaXMuX2lzVVRDID8gbW9tZW50LnV0Yyh0aGlzLl9hKSA6IG1vbWVudCh0aGlzLl9hKSkudG9BcnJheSgpKSA+IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzaW5nRmxhZ3MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZXh0ZW5kKHt9LCB0aGlzLl9wZik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW52YWxpZEF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGYub3ZlcmZsb3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXRjIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuem9uZSgwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2NhbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuem9uZSgwKTtcbiAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBmb3JtYXQgOiBmdW5jdGlvbiAoaW5wdXRTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBmb3JtYXRNb21lbnQodGhpcywgaW5wdXRTdHJpbmcgfHwgbW9tZW50LmRlZmF1bHRGb3JtYXQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgdmFyIGR1cjtcbiAgICAgICAgICAgIC8vIHN3aXRjaCBhcmdzIHRvIHN1cHBvcnQgYWRkKCdzJywgMSkgYW5kIGFkZCgxLCAncycpXG4gICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpc05hTigrdmFsKSA/ICtpbnB1dCA6ICt2YWwsIGlzTmFOKCt2YWwpID8gdmFsIDogaW5wdXQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZHVyID0gbW9tZW50LmR1cmF0aW9uKCt2YWwsIGlucHV0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZHVyID0gbW9tZW50LmR1cmF0aW9uKGlucHV0LCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudCh0aGlzLCBkdXIsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3VidHJhY3QgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgdmFyIGR1cjtcbiAgICAgICAgICAgIC8vIHN3aXRjaCBhcmdzIHRvIHN1cHBvcnQgc3VidHJhY3QoJ3MnLCAxKSBhbmQgc3VidHJhY3QoMSwgJ3MnKVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24oaXNOYU4oK3ZhbCkgPyAraW5wdXQgOiArdmFsLCBpc05hTigrdmFsKSA/IHZhbCA6IGlucHV0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbigrdmFsLCBpbnB1dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZE9yU3VidHJhY3REdXJhdGlvbkZyb21Nb21lbnQodGhpcywgZHVyLCAtMSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBkaWZmIDogZnVuY3Rpb24gKGlucHV0LCB1bml0cywgYXNGbG9hdCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSBtYWtlQXMoaW5wdXQsIHRoaXMpLFxuICAgICAgICAgICAgICAgIHpvbmVEaWZmID0gKHRoaXMuem9uZSgpIC0gdGhhdC56b25lKCkpICogNmU0LFxuICAgICAgICAgICAgICAgIGRpZmYsIG91dHB1dDtcblxuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG5cbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3llYXInIHx8IHVuaXRzID09PSAnbW9udGgnKSB7XG4gICAgICAgICAgICAgICAgLy8gYXZlcmFnZSBudW1iZXIgb2YgZGF5cyBpbiB0aGUgbW9udGhzIGluIHRoZSBnaXZlbiBkYXRlc1xuICAgICAgICAgICAgICAgIGRpZmYgPSAodGhpcy5kYXlzSW5Nb250aCgpICsgdGhhdC5kYXlzSW5Nb250aCgpKSAqIDQzMmU1OyAvLyAyNCAqIDYwICogNjAgKiAxMDAwIC8gMlxuICAgICAgICAgICAgICAgIC8vIGRpZmZlcmVuY2UgaW4gbW9udGhzXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gKCh0aGlzLnllYXIoKSAtIHRoYXQueWVhcigpKSAqIDEyKSArICh0aGlzLm1vbnRoKCkgLSB0aGF0Lm1vbnRoKCkpO1xuICAgICAgICAgICAgICAgIC8vIGFkanVzdCBieSB0YWtpbmcgZGlmZmVyZW5jZSBpbiBkYXlzLCBhdmVyYWdlIG51bWJlciBvZiBkYXlzXG4gICAgICAgICAgICAgICAgLy8gYW5kIGRzdCBpbiB0aGUgZ2l2ZW4gbW9udGhzLlxuICAgICAgICAgICAgICAgIG91dHB1dCArPSAoKHRoaXMgLSBtb21lbnQodGhpcykuc3RhcnRPZignbW9udGgnKSkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoYXQgLSBtb21lbnQodGhhdCkuc3RhcnRPZignbW9udGgnKSkpIC8gZGlmZjtcbiAgICAgICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aXRoIHpvbmVzLCB0byBuZWdhdGUgYWxsIGRzdFxuICAgICAgICAgICAgICAgIG91dHB1dCAtPSAoKHRoaXMuem9uZSgpIC0gbW9tZW50KHRoaXMpLnN0YXJ0T2YoJ21vbnRoJykuem9uZSgpKSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAodGhhdC56b25lKCkgLSBtb21lbnQodGhhdCkuc3RhcnRPZignbW9udGgnKS56b25lKCkpKSAqIDZlNCAvIGRpZmY7XG4gICAgICAgICAgICAgICAgaWYgKHVuaXRzID09PSAneWVhcicpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0ID0gb3V0cHV0IC8gMTI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gKHRoaXMgLSB0aGF0KTtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB1bml0cyA9PT0gJ3NlY29uZCcgPyBkaWZmIC8gMWUzIDogLy8gMTAwMFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ21pbnV0ZScgPyBkaWZmIC8gNmU0IDogLy8gMTAwMCAqIDYwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnaG91cicgPyBkaWZmIC8gMzZlNSA6IC8vIDEwMDAgKiA2MCAqIDYwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnZGF5JyA/IChkaWZmIC0gem9uZURpZmYpIC8gODY0ZTUgOiAvLyAxMDAwICogNjAgKiA2MCAqIDI0LCBuZWdhdGUgZHN0XG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnd2VlaycgPyAoZGlmZiAtIHpvbmVEaWZmKSAvIDYwNDhlNSA6IC8vIDEwMDAgKiA2MCAqIDYwICogMjQgKiA3LCBuZWdhdGUgZHN0XG4gICAgICAgICAgICAgICAgICAgIGRpZmY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXNGbG9hdCA/IG91dHB1dCA6IGFic1JvdW5kKG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZnJvbSA6IGZ1bmN0aW9uICh0aW1lLCB3aXRob3V0U3VmZml4KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmR1cmF0aW9uKHRoaXMuZGlmZih0aW1lKSkubGFuZyh0aGlzLmxhbmcoKS5fYWJicikuaHVtYW5pemUoIXdpdGhvdXRTdWZmaXgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZyb21Ob3cgOiBmdW5jdGlvbiAod2l0aG91dFN1ZmZpeCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZnJvbShtb21lbnQoKSwgd2l0aG91dFN1ZmZpeCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsZW5kYXIgOiBmdW5jdGlvbiAodGltZSkge1xuICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBjb21wYXJlIHRoZSBzdGFydCBvZiB0b2RheSwgdnMgdGhpcy5cbiAgICAgICAgICAgIC8vIEdldHRpbmcgc3RhcnQtb2YtdG9kYXkgZGVwZW5kcyBvbiB3aGV0aGVyIHdlJ3JlIHpvbmUnZCBvciBub3QuXG4gICAgICAgICAgICB2YXIgbm93ID0gdGltZSB8fCBtb21lbnQoKSxcbiAgICAgICAgICAgICAgICBzb2QgPSBtYWtlQXMobm93LCB0aGlzKS5zdGFydE9mKCdkYXknKSxcbiAgICAgICAgICAgICAgICBkaWZmID0gdGhpcy5kaWZmKHNvZCwgJ2RheXMnLCB0cnVlKSxcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSBkaWZmIDwgLTYgPyAnc2FtZUVsc2UnIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IC0xID8gJ2xhc3RXZWVrJyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAwID8gJ2xhc3REYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDEgPyAnc2FtZURheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMiA/ICduZXh0RGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCA3ID8gJ25leHRXZWVrJyA6ICdzYW1lRWxzZSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQodGhpcy5sYW5nKCkuY2FsZW5kYXIoZm9ybWF0LCB0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNMZWFwWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpc0xlYXBZZWFyKHRoaXMueWVhcigpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0RTVCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAodGhpcy56b25lKCkgPCB0aGlzLmNsb25lKCkubW9udGgoMCkuem9uZSgpIHx8XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKCkgPCB0aGlzLmNsb25lKCkubW9udGgoNSkuem9uZSgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciBkYXkgPSB0aGlzLl9pc1VUQyA/IHRoaXMuX2QuZ2V0VVRDRGF5KCkgOiB0aGlzLl9kLmdldERheSgpO1xuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IHBhcnNlV2Vla2RheShpbnB1dCwgdGhpcy5sYW5nKCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZCh7IGQgOiBpbnB1dCAtIGRheSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBtb250aCA6IG1ha2VBY2Nlc3NvcignTW9udGgnLCB0cnVlKSxcblxuICAgICAgICBzdGFydE9mOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgLy8gdGhlIGZvbGxvd2luZyBzd2l0Y2ggaW50ZW50aW9uYWxseSBvbWl0cyBicmVhayBrZXl3b3Jkc1xuICAgICAgICAgICAgLy8gdG8gdXRpbGl6ZSBmYWxsaW5nIHRocm91Z2ggdGhlIGNhc2VzLlxuICAgICAgICAgICAgc3dpdGNoICh1bml0cykge1xuICAgICAgICAgICAgY2FzZSAneWVhcic6XG4gICAgICAgICAgICAgICAgdGhpcy5tb250aCgwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdxdWFydGVyJzpcbiAgICAgICAgICAgIGNhc2UgJ21vbnRoJzpcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGUoMSk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAnd2Vlayc6XG4gICAgICAgICAgICBjYXNlICdpc29XZWVrJzpcbiAgICAgICAgICAgIGNhc2UgJ2RheSc6XG4gICAgICAgICAgICAgICAgdGhpcy5ob3VycygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICBjYXNlICdob3VyJzpcbiAgICAgICAgICAgICAgICB0aGlzLm1pbnV0ZXMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAnbWludXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZHMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAnc2Vjb25kJzpcbiAgICAgICAgICAgICAgICB0aGlzLm1pbGxpc2Vjb25kcygwKTtcbiAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHdlZWtzIGFyZSBhIHNwZWNpYWwgY2FzZVxuICAgICAgICAgICAgaWYgKHVuaXRzID09PSAnd2VlaycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtkYXkoMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVuaXRzID09PSAnaXNvV2VlaycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzb1dlZWtkYXkoMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHF1YXJ0ZXJzIGFyZSBhbHNvIHNwZWNpYWxcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb250aChNYXRoLmZsb29yKHRoaXMubW9udGgoKSAvIDMpICogMyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGVuZE9mOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnRPZih1bml0cykuYWRkKCh1bml0cyA9PT0gJ2lzb1dlZWsnID8gJ3dlZWsnIDogdW5pdHMpLCAxKS5zdWJ0cmFjdCgnbXMnLCAxKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0FmdGVyOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IHR5cGVvZiB1bml0cyAhPT0gJ3VuZGVmaW5lZCcgPyB1bml0cyA6ICdtaWxsaXNlY29uZCc7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMuY2xvbmUoKS5zdGFydE9mKHVuaXRzKSA+ICttb21lbnQoaW5wdXQpLnN0YXJ0T2YodW5pdHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzQmVmb3JlOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IHR5cGVvZiB1bml0cyAhPT0gJ3VuZGVmaW5lZCcgPyB1bml0cyA6ICdtaWxsaXNlY29uZCc7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMuY2xvbmUoKS5zdGFydE9mKHVuaXRzKSA8ICttb21lbnQoaW5wdXQpLnN0YXJ0T2YodW5pdHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzU2FtZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSB1bml0cyB8fCAnbXMnO1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLmNsb25lKCkuc3RhcnRPZih1bml0cykgPT09ICttYWtlQXMoaW5wdXQsIHRoaXMpLnN0YXJ0T2YodW5pdHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1pbjogZGVwcmVjYXRlKFxuICAgICAgICAgICAgICAgICBcIm1vbWVudCgpLm1pbiBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1pbiBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OFwiLFxuICAgICAgICAgICAgICAgICBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgIG90aGVyID0gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3RoZXIgPCB0aGlzID8gdGhpcyA6IG90aGVyO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICApLFxuXG4gICAgICAgIG1heDogZGVwcmVjYXRlKFxuICAgICAgICAgICAgICAgIFwibW9tZW50KCkubWF4IGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWF4IGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNTQ4XCIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG90aGVyID0gbW9tZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdGhlciA+IHRoaXMgPyB0aGlzIDogb3RoZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIC8vIGtlZXBUaW1lID0gdHJ1ZSBtZWFucyBvbmx5IGNoYW5nZSB0aGUgdGltZXpvbmUsIHdpdGhvdXQgYWZmZWN0aW5nXG4gICAgICAgIC8vIHRoZSBsb2NhbCBob3VyLiBTbyA1OjMxOjI2ICswMzAwIC0tW3pvbmUoMiwgdHJ1ZSldLS0+IDU6MzE6MjYgKzAyMDBcbiAgICAgICAgLy8gSXQgaXMgcG9zc2libGUgdGhhdCA1OjMxOjI2IGRvZXNuJ3QgZXhpc3QgaW50IHpvbmUgKzAyMDAsIHNvIHdlXG4gICAgICAgIC8vIGFkanVzdCB0aGUgdGltZSBhcyBuZWVkZWQsIHRvIGJlIHZhbGlkLlxuICAgICAgICAvL1xuICAgICAgICAvLyBLZWVwaW5nIHRoZSB0aW1lIGFjdHVhbGx5IGFkZHMvc3VidHJhY3RzIChvbmUgaG91cilcbiAgICAgICAgLy8gZnJvbSB0aGUgYWN0dWFsIHJlcHJlc2VudGVkIHRpbWUuIFRoYXQgaXMgd2h5IHdlIGNhbGwgdXBkYXRlT2Zmc2V0XG4gICAgICAgIC8vIGEgc2Vjb25kIHRpbWUuIEluIGNhc2UgaXQgd2FudHMgdXMgdG8gY2hhbmdlIHRoZSBvZmZzZXQgYWdhaW5cbiAgICAgICAgLy8gX2NoYW5nZUluUHJvZ3Jlc3MgPT0gdHJ1ZSBjYXNlLCB0aGVuIHdlIGhhdmUgdG8gYWRqdXN0LCBiZWNhdXNlXG4gICAgICAgIC8vIHRoZXJlIGlzIG5vIHN1Y2ggdGltZSBpbiB0aGUgZ2l2ZW4gdGltZXpvbmUuXG4gICAgICAgIHpvbmUgOiBmdW5jdGlvbiAoaW5wdXQsIGtlZXBUaW1lKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fb2Zmc2V0IHx8IDA7XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQgPSB0aW1lem9uZU1pbnV0ZXNGcm9tU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKGlucHV0KSA8IDE2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0ID0gaW5wdXQgKiA2MDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fb2Zmc2V0ID0gaW5wdXQ7XG4gICAgICAgICAgICAgICAgdGhpcy5faXNVVEMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgha2VlcFRpbWUgfHwgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudCh0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb21lbnQuZHVyYXRpb24ob2Zmc2V0IC0gaW5wdXQsICdtJyksIDEsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb21lbnQudXBkYXRlT2Zmc2V0KHRoaXMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2hhbmdlSW5Qcm9ncmVzcyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/IG9mZnNldCA6IHRoaXMuX2QuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHpvbmVBYmJyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gXCJVVENcIiA6IFwiXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgem9uZU5hbWUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyBcIkNvb3JkaW5hdGVkIFVuaXZlcnNhbCBUaW1lXCIgOiBcIlwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBhcnNlWm9uZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl90em0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvbmUodGhpcy5fdHptKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuX2kgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKHRoaXMuX2kpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFzQWxpZ25lZEhvdXJPZmZzZXQgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIGlmICghaW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudChpbnB1dCkuem9uZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuem9uZSgpIC0gaW5wdXQpICUgNjAgPT09IDA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5c0luTW9udGggOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF5c0luTW9udGgodGhpcy55ZWFyKCksIHRoaXMubW9udGgoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5T2ZZZWFyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgZGF5T2ZZZWFyID0gcm91bmQoKG1vbWVudCh0aGlzKS5zdGFydE9mKCdkYXknKSAtIG1vbWVudCh0aGlzKS5zdGFydE9mKCd5ZWFyJykpIC8gODY0ZTUpICsgMTtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gZGF5T2ZZZWFyIDogdGhpcy5hZGQoXCJkXCIsIChpbnB1dCAtIGRheU9mWWVhcikpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHF1YXJ0ZXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gTWF0aC5jZWlsKCh0aGlzLm1vbnRoKCkgKyAxKSAvIDMpIDogdGhpcy5tb250aCgoaW5wdXQgLSAxKSAqIDMgKyB0aGlzLm1vbnRoKCkgJSAzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHllYXIgPSB3ZWVrT2ZZZWFyKHRoaXMsIHRoaXMubGFuZygpLl93ZWVrLmRvdywgdGhpcy5sYW5nKCkuX3dlZWsuZG95KS55ZWFyO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoXCJ5XCIsIChpbnB1dCAtIHllYXIpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHllYXIgPSB3ZWVrT2ZZZWFyKHRoaXMsIDEsIDQpLnllYXI7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHllYXIgOiB0aGlzLmFkZChcInlcIiwgKGlucHV0IC0geWVhcikpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWsgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrID0gdGhpcy5sYW5nKCkud2Vlayh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2VlayA6IHRoaXMuYWRkKFwiZFwiLCAoaW5wdXQgLSB3ZWVrKSAqIDcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWsgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS53ZWVrO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrIDogdGhpcy5hZGQoXCJkXCIsIChpbnB1dCAtIHdlZWspICogNyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla2RheSA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIHdlZWtkYXkgPSAodGhpcy5kYXkoKSArIDcgLSB0aGlzLmxhbmcoKS5fd2Vlay5kb3cpICUgNztcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2Vla2RheSA6IHRoaXMuYWRkKFwiZFwiLCBpbnB1dCAtIHdlZWtkYXkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWtkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIC8vIGJlaGF2ZXMgdGhlIHNhbWUgYXMgbW9tZW50I2RheSBleGNlcHRcbiAgICAgICAgICAgIC8vIGFzIGEgZ2V0dGVyLCByZXR1cm5zIDcgaW5zdGVhZCBvZiAwICgxLTcgcmFuZ2UgaW5zdGVhZCBvZiAwLTYpXG4gICAgICAgICAgICAvLyBhcyBhIHNldHRlciwgc3VuZGF5IHNob3VsZCBiZWxvbmcgdG8gdGhlIHByZXZpb3VzIHdlZWsuXG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHRoaXMuZGF5KCkgfHwgNyA6IHRoaXMuZGF5KHRoaXMuZGF5KCkgJSA3ID8gaW5wdXQgOiBpbnB1dCAtIDcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWtzSW5ZZWFyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtzSW5ZZWFyKHRoaXMueWVhcigpLCAxLCA0KTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrc0luWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrSW5mbyA9IHRoaXMuX2xhbmcuX3dlZWs7XG4gICAgICAgICAgICByZXR1cm4gd2Vla3NJblllYXIodGhpcy55ZWFyKCksIHdlZWtJbmZvLmRvdywgd2Vla0luZm8uZG95KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHNdKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKHVuaXRzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbdW5pdHNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpc1t1bml0c10odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gSWYgcGFzc2VkIGEgbGFuZ3VhZ2Uga2V5LCBpdCB3aWxsIHNldCB0aGUgbGFuZ3VhZ2UgZm9yIHRoaXNcbiAgICAgICAgLy8gaW5zdGFuY2UuICBPdGhlcndpc2UsIGl0IHdpbGwgcmV0dXJuIHRoZSBsYW5ndWFnZSBjb25maWd1cmF0aW9uXG4gICAgICAgIC8vIHZhcmlhYmxlcyBmb3IgdGhpcyBpbnN0YW5jZS5cbiAgICAgICAgbGFuZyA6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9sYW5nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sYW5nID0gZ2V0TGFuZ0RlZmluaXRpb24oa2V5KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gcmF3TW9udGhTZXR0ZXIobW9tLCB2YWx1ZSkge1xuICAgICAgICB2YXIgZGF5T2ZNb250aDtcblxuICAgICAgICAvLyBUT0RPOiBNb3ZlIHRoaXMgb3V0IG9mIGhlcmUhXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG1vbS5sYW5nKCkubW9udGhzUGFyc2UodmFsdWUpO1xuICAgICAgICAgICAgLy8gVE9ETzogQW5vdGhlciBzaWxlbnQgZmFpbHVyZT9cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRheU9mTW9udGggPSBNYXRoLm1pbihtb20uZGF0ZSgpLFxuICAgICAgICAgICAgICAgIGRheXNJbk1vbnRoKG1vbS55ZWFyKCksIHZhbHVlKSk7XG4gICAgICAgIG1vbS5fZFsnc2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyAnTW9udGgnXSh2YWx1ZSwgZGF5T2ZNb250aCk7XG4gICAgICAgIHJldHVybiBtb207XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmF3R2V0dGVyKG1vbSwgdW5pdCkge1xuICAgICAgICByZXR1cm4gbW9tLl9kWydnZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArIHVuaXRdKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmF3U2V0dGVyKG1vbSwgdW5pdCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKHVuaXQgPT09ICdNb250aCcpIHtcbiAgICAgICAgICAgIHJldHVybiByYXdNb250aFNldHRlcihtb20sIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgdW5pdF0odmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUFjY2Vzc29yKHVuaXQsIGtlZXBUaW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmF3U2V0dGVyKHRoaXMsIHVuaXQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBtb21lbnQudXBkYXRlT2Zmc2V0KHRoaXMsIGtlZXBUaW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhd0dldHRlcih0aGlzLCB1bml0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBtb21lbnQuZm4ubWlsbGlzZWNvbmQgPSBtb21lbnQuZm4ubWlsbGlzZWNvbmRzID0gbWFrZUFjY2Vzc29yKCdNaWxsaXNlY29uZHMnLCBmYWxzZSk7XG4gICAgbW9tZW50LmZuLnNlY29uZCA9IG1vbWVudC5mbi5zZWNvbmRzID0gbWFrZUFjY2Vzc29yKCdTZWNvbmRzJywgZmFsc2UpO1xuICAgIG1vbWVudC5mbi5taW51dGUgPSBtb21lbnQuZm4ubWludXRlcyA9IG1ha2VBY2Nlc3NvcignTWludXRlcycsIGZhbHNlKTtcbiAgICAvLyBTZXR0aW5nIHRoZSBob3VyIHNob3VsZCBrZWVwIHRoZSB0aW1lLCBiZWNhdXNlIHRoZSB1c2VyIGV4cGxpY2l0bHlcbiAgICAvLyBzcGVjaWZpZWQgd2hpY2ggaG91ciBoZSB3YW50cy4gU28gdHJ5aW5nIHRvIG1haW50YWluIHRoZSBzYW1lIGhvdXIgKGluXG4gICAgLy8gYSBuZXcgdGltZXpvbmUpIG1ha2VzIHNlbnNlLiBBZGRpbmcvc3VidHJhY3RpbmcgaG91cnMgZG9lcyBub3QgZm9sbG93XG4gICAgLy8gdGhpcyBydWxlLlxuICAgIG1vbWVudC5mbi5ob3VyID0gbW9tZW50LmZuLmhvdXJzID0gbWFrZUFjY2Vzc29yKCdIb3VycycsIHRydWUpO1xuICAgIC8vIG1vbWVudC5mbi5tb250aCBpcyBkZWZpbmVkIHNlcGFyYXRlbHlcbiAgICBtb21lbnQuZm4uZGF0ZSA9IG1ha2VBY2Nlc3NvcignRGF0ZScsIHRydWUpO1xuICAgIG1vbWVudC5mbi5kYXRlcyA9IGRlcHJlY2F0ZShcImRhdGVzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSBkYXRlIGluc3RlYWQuXCIsIG1ha2VBY2Nlc3NvcignRGF0ZScsIHRydWUpKTtcbiAgICBtb21lbnQuZm4ueWVhciA9IG1ha2VBY2Nlc3NvcignRnVsbFllYXInLCB0cnVlKTtcbiAgICBtb21lbnQuZm4ueWVhcnMgPSBkZXByZWNhdGUoXCJ5ZWFycyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgeWVhciBpbnN0ZWFkLlwiLCBtYWtlQWNjZXNzb3IoJ0Z1bGxZZWFyJywgdHJ1ZSkpO1xuXG4gICAgLy8gYWRkIHBsdXJhbCBtZXRob2RzXG4gICAgbW9tZW50LmZuLmRheXMgPSBtb21lbnQuZm4uZGF5O1xuICAgIG1vbWVudC5mbi5tb250aHMgPSBtb21lbnQuZm4ubW9udGg7XG4gICAgbW9tZW50LmZuLndlZWtzID0gbW9tZW50LmZuLndlZWs7XG4gICAgbW9tZW50LmZuLmlzb1dlZWtzID0gbW9tZW50LmZuLmlzb1dlZWs7XG4gICAgbW9tZW50LmZuLnF1YXJ0ZXJzID0gbW9tZW50LmZuLnF1YXJ0ZXI7XG5cbiAgICAvLyBhZGQgYWxpYXNlZCBmb3JtYXQgbWV0aG9kc1xuICAgIG1vbWVudC5mbi50b0pTT04gPSBtb21lbnQuZm4udG9JU09TdHJpbmc7XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIER1cmF0aW9uIFByb3RvdHlwZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZXh0ZW5kKG1vbWVudC5kdXJhdGlvbi5mbiA9IER1cmF0aW9uLnByb3RvdHlwZSwge1xuXG4gICAgICAgIF9idWJibGUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gdGhpcy5fbWlsbGlzZWNvbmRzLFxuICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9kYXlzLFxuICAgICAgICAgICAgICAgIG1vbnRocyA9IHRoaXMuX21vbnRocyxcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5fZGF0YSxcbiAgICAgICAgICAgICAgICBzZWNvbmRzLCBtaW51dGVzLCBob3VycywgeWVhcnM7XG5cbiAgICAgICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY29kZSBidWJibGVzIHVwIHZhbHVlcywgc2VlIHRoZSB0ZXN0cyBmb3JcbiAgICAgICAgICAgIC8vIGV4YW1wbGVzIG9mIHdoYXQgdGhhdCBtZWFucy5cbiAgICAgICAgICAgIGRhdGEubWlsbGlzZWNvbmRzID0gbWlsbGlzZWNvbmRzICUgMTAwMDtcblxuICAgICAgICAgICAgc2Vjb25kcyA9IGFic1JvdW5kKG1pbGxpc2Vjb25kcyAvIDEwMDApO1xuICAgICAgICAgICAgZGF0YS5zZWNvbmRzID0gc2Vjb25kcyAlIDYwO1xuXG4gICAgICAgICAgICBtaW51dGVzID0gYWJzUm91bmQoc2Vjb25kcyAvIDYwKTtcbiAgICAgICAgICAgIGRhdGEubWludXRlcyA9IG1pbnV0ZXMgJSA2MDtcblxuICAgICAgICAgICAgaG91cnMgPSBhYnNSb3VuZChtaW51dGVzIC8gNjApO1xuICAgICAgICAgICAgZGF0YS5ob3VycyA9IGhvdXJzICUgMjQ7XG5cbiAgICAgICAgICAgIGRheXMgKz0gYWJzUm91bmQoaG91cnMgLyAyNCk7XG4gICAgICAgICAgICBkYXRhLmRheXMgPSBkYXlzICUgMzA7XG5cbiAgICAgICAgICAgIG1vbnRocyArPSBhYnNSb3VuZChkYXlzIC8gMzApO1xuICAgICAgICAgICAgZGF0YS5tb250aHMgPSBtb250aHMgJSAxMjtcblxuICAgICAgICAgICAgeWVhcnMgPSBhYnNSb3VuZChtb250aHMgLyAxMik7XG4gICAgICAgICAgICBkYXRhLnllYXJzID0geWVhcnM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla3MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYWJzUm91bmQodGhpcy5kYXlzKCkgLyA3KTtcbiAgICAgICAgfSxcblxuICAgICAgICB2YWx1ZU9mIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICAgIHRoaXMuX2RheXMgKiA4NjRlNSArXG4gICAgICAgICAgICAgICh0aGlzLl9tb250aHMgJSAxMikgKiAyNTkyZTYgK1xuICAgICAgICAgICAgICB0b0ludCh0aGlzLl9tb250aHMgLyAxMikgKiAzMTUzNmU2O1xuICAgICAgICB9LFxuXG4gICAgICAgIGh1bWFuaXplIDogZnVuY3Rpb24gKHdpdGhTdWZmaXgpIHtcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gK3RoaXMsXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gcmVsYXRpdmVUaW1lKGRpZmZlcmVuY2UsICF3aXRoU3VmZml4LCB0aGlzLmxhbmcoKSk7XG5cbiAgICAgICAgICAgIGlmICh3aXRoU3VmZml4KSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdGhpcy5sYW5nKCkucGFzdEZ1dHVyZShkaWZmZXJlbmNlLCBvdXRwdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkucG9zdGZvcm1hdChvdXRwdXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFkZCA6IGZ1bmN0aW9uIChpbnB1dCwgdmFsKSB7XG4gICAgICAgICAgICAvLyBzdXBwb3J0cyBvbmx5IDIuMC1zdHlsZSBhZGQoMSwgJ3MnKSBvciBhZGQobW9tZW50KVxuICAgICAgICAgICAgdmFyIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcblxuICAgICAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzICs9IGR1ci5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyArPSBkdXIuX2RheXM7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgKz0gZHVyLl9tb250aHM7XG5cbiAgICAgICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJ0cmFjdCA6IGZ1bmN0aW9uIChpbnB1dCwgdmFsKSB7XG4gICAgICAgICAgICB2YXIgZHVyID0gbW9tZW50LmR1cmF0aW9uKGlucHV0LCB2YWwpO1xuXG4gICAgICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgLT0gZHVyLl9taWxsaXNlY29uZHM7XG4gICAgICAgICAgICB0aGlzLl9kYXlzIC09IGR1ci5fZGF5cztcbiAgICAgICAgICAgIHRoaXMuX21vbnRocyAtPSBkdXIuX21vbnRocztcblxuICAgICAgICAgICAgdGhpcy5fYnViYmxlKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldCA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1t1bml0cy50b0xvd2VyQ2FzZSgpICsgJ3MnXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFzIDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzWydhcycgKyB1bml0cy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHVuaXRzLnNsaWNlKDEpICsgJ3MnXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxhbmcgOiBtb21lbnQuZm4ubGFuZyxcblxuICAgICAgICB0b0lzb1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9kb3JkaWxsZS9tb21lbnQtaXNvZHVyYXRpb24vYmxvYi9tYXN0ZXIvbW9tZW50Lmlzb2R1cmF0aW9uLmpzXG4gICAgICAgICAgICB2YXIgeWVhcnMgPSBNYXRoLmFicyh0aGlzLnllYXJzKCkpLFxuICAgICAgICAgICAgICAgIG1vbnRocyA9IE1hdGguYWJzKHRoaXMubW9udGhzKCkpLFxuICAgICAgICAgICAgICAgIGRheXMgPSBNYXRoLmFicyh0aGlzLmRheXMoKSksXG4gICAgICAgICAgICAgICAgaG91cnMgPSBNYXRoLmFicyh0aGlzLmhvdXJzKCkpLFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBNYXRoLmFicyh0aGlzLm1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuc2Vjb25kcygpICsgdGhpcy5taWxsaXNlY29uZHMoKSAvIDEwMDApO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXNTZWNvbmRzKCkpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHRoZSBzYW1lIGFzIEMjJ3MgKE5vZGEpIGFuZCBweXRob24gKGlzb2RhdGUpLi4uXG4gICAgICAgICAgICAgICAgLy8gYnV0IG5vdCBvdGhlciBKUyAoZ29vZy5kYXRlKVxuICAgICAgICAgICAgICAgIHJldHVybiAnUDBEJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLmFzU2Vjb25kcygpIDwgMCA/ICctJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgJ1AnICtcbiAgICAgICAgICAgICAgICAoeWVhcnMgPyB5ZWFycyArICdZJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKG1vbnRocyA/IG1vbnRocyArICdNJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKGRheXMgPyBkYXlzICsgJ0QnIDogJycpICtcbiAgICAgICAgICAgICAgICAoKGhvdXJzIHx8IG1pbnV0ZXMgfHwgc2Vjb25kcykgPyAnVCcgOiAnJykgK1xuICAgICAgICAgICAgICAgIChob3VycyA/IGhvdXJzICsgJ0gnIDogJycpICtcbiAgICAgICAgICAgICAgICAobWludXRlcyA/IG1pbnV0ZXMgKyAnTScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChzZWNvbmRzID8gc2Vjb25kcyArICdTJyA6ICcnKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gbWFrZUR1cmF0aW9uR2V0dGVyKG5hbWUpIHtcbiAgICAgICAgbW9tZW50LmR1cmF0aW9uLmZuW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGFbbmFtZV07XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUR1cmF0aW9uQXNHZXR0ZXIobmFtZSwgZmFjdG9yKSB7XG4gICAgICAgIG1vbWVudC5kdXJhdGlvbi5mblsnYXMnICsgbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMgLyBmYWN0b3I7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZm9yIChpIGluIHVuaXRNaWxsaXNlY29uZEZhY3RvcnMpIHtcbiAgICAgICAgaWYgKHVuaXRNaWxsaXNlY29uZEZhY3RvcnMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgIG1ha2VEdXJhdGlvbkFzR2V0dGVyKGksIHVuaXRNaWxsaXNlY29uZEZhY3RvcnNbaV0pO1xuICAgICAgICAgICAgbWFrZUR1cmF0aW9uR2V0dGVyKGkudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYWtlRHVyYXRpb25Bc0dldHRlcignV2Vla3MnLCA2MDQ4ZTUpO1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc01vbnRocyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICgrdGhpcyAtIHRoaXMueWVhcnMoKSAqIDMxNTM2ZTYpIC8gMjU5MmU2ICsgdGhpcy55ZWFycygpICogMTI7XG4gICAgfTtcblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEZWZhdWx0IExhbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIFNldCBkZWZhdWx0IGxhbmd1YWdlLCBvdGhlciBsYW5ndWFnZXMgd2lsbCBpbmhlcml0IGZyb20gRW5nbGlzaC5cbiAgICBtb21lbnQubGFuZygnZW4nLCB7XG4gICAgICAgIG9yZGluYWwgOiBmdW5jdGlvbiAobnVtYmVyKSB7XG4gICAgICAgICAgICB2YXIgYiA9IG51bWJlciAlIDEwLFxuICAgICAgICAgICAgICAgIG91dHB1dCA9ICh0b0ludChudW1iZXIgJSAxMDAgLyAxMCkgPT09IDEpID8gJ3RoJyA6XG4gICAgICAgICAgICAgICAgKGIgPT09IDEpID8gJ3N0JyA6XG4gICAgICAgICAgICAgICAgKGIgPT09IDIpID8gJ25kJyA6XG4gICAgICAgICAgICAgICAgKGIgPT09IDMpID8gJ3JkJyA6ICd0aCc7XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyICsgb3V0cHV0O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKiBFTUJFRF9MQU5HVUFHRVMgKi9cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRXhwb3NpbmcgTW9tZW50XG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZUdsb2JhbChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgLypnbG9iYWwgZW5kZXI6ZmFsc2UgKi9cbiAgICAgICAgaWYgKHR5cGVvZiBlbmRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvbGRHbG9iYWxNb21lbnQgPSBnbG9iYWxTY29wZS5tb21lbnQ7XG4gICAgICAgIGlmIChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgICAgXCJBY2Nlc3NpbmcgTW9tZW50IHRocm91Z2ggdGhlIGdsb2JhbCBzY29wZSBpcyBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiZGVwcmVjYXRlZCwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwicmVsZWFzZS5cIixcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG1vbWVudDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbW1vbkpTIG1vZHVsZSBpcyBkZWZpbmVkXG4gICAgaWYgKGhhc01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1vbWVudDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShcIm1vbWVudFwiLCBmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG4gICAgICAgICAgICBpZiAobW9kdWxlLmNvbmZpZyAmJiBtb2R1bGUuY29uZmlnKCkgJiYgbW9kdWxlLmNvbmZpZygpLm5vR2xvYmFsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVsZWFzZSB0aGUgZ2xvYmFsIHZhcmlhYmxlXG4gICAgICAgICAgICAgICAgZ2xvYmFsU2NvcGUubW9tZW50ID0gb2xkR2xvYmFsTW9tZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbW9tZW50O1xuICAgICAgICB9KTtcbiAgICAgICAgbWFrZUdsb2JhbCh0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtYWtlR2xvYmFsKCk7XG4gICAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjJcbihmdW5jdGlvbigpIHtcbiAgdmFyIGRlcHJlY2F0ZSwgaGFzTW9kdWxlLCBtYWtlVHdpeCxcbiAgICBfX3NsaWNlID0gW10uc2xpY2U7XG5cbiAgaGFzTW9kdWxlID0gKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlICE9PSBudWxsKSAmJiAobW9kdWxlLmV4cG9ydHMgIT0gbnVsbCk7XG5cbiAgZGVwcmVjYXRlID0gZnVuY3Rpb24obmFtZSwgaW5zdGVhZCwgZm4pIHtcbiAgICB2YXIgYWxyZWFkeURvbmU7XG5cbiAgICBhbHJlYWR5RG9uZSA9IGZhbHNlO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzO1xuXG4gICAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAgIGlmICghYWxyZWFkeURvbmUpIHtcbiAgICAgICAgaWYgKCh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjb25zb2xlICE9PSBudWxsKSAmJiAoY29uc29sZS53YXJuICE9IG51bGwpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiI1wiICsgbmFtZSArIFwiIGlzIGRlcHJlY2F0ZWQuIFVzZSAjXCIgKyBpbnN0ZWFkICsgXCIgaW5zdGVhZC5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFscmVhZHlEb25lID0gdHJ1ZTtcbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIG1ha2VUd2l4ID0gZnVuY3Rpb24obW9tZW50KSB7XG4gICAgdmFyIFR3aXgsIGdldFByb3RvdHlwZU9mLCBsYW5ndWFnZXNMb2FkZWQ7XG5cbiAgICBpZiAobW9tZW50ID09IG51bGwpIHtcbiAgICAgIHRocm93IFwiQ2FuJ3QgZmluZCBtb21lbnRcIjtcbiAgICB9XG4gICAgbGFuZ3VhZ2VzTG9hZGVkID0gZmFsc2U7XG4gICAgVHdpeCA9IChmdW5jdGlvbigpIHtcbiAgICAgIGZ1bmN0aW9uIFR3aXgoc3RhcnQsIGVuZCwgcGFyc2VGb3JtYXQsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIF9yZWY7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHBhcnNlRm9ybWF0ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgb3B0aW9ucyA9IHBhcnNlRm9ybWF0ICE9IG51bGwgPyBwYXJzZUZvcm1hdCA6IHt9O1xuICAgICAgICAgIHBhcnNlRm9ybWF0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGFsbERheTogb3B0aW9uc1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGFydCA9IG1vbWVudChzdGFydCwgcGFyc2VGb3JtYXQsIG9wdGlvbnMucGFyc2VTdHJpY3QpO1xuICAgICAgICB0aGlzLmVuZCA9IG1vbWVudChlbmQsIHBhcnNlRm9ybWF0LCBvcHRpb25zLnBhcnNlU3RyaWN0KTtcbiAgICAgICAgdGhpcy5hbGxEYXkgPSAoX3JlZiA9IG9wdGlvbnMuYWxsRGF5KSAhPSBudWxsID8gX3JlZiA6IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBUd2l4Ll9leHRlbmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGF0dHIsIGZpcnN0LCBvdGhlciwgb3RoZXJzLCBfaSwgX2xlbjtcblxuICAgICAgICBmaXJzdCA9IGFyZ3VtZW50c1swXSwgb3RoZXJzID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgICAgICAgZm9yIChfaSA9IDAsIF9sZW4gPSBvdGhlcnMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgICBvdGhlciA9IG90aGVyc1tfaV07XG4gICAgICAgICAgZm9yIChhdHRyIGluIG90aGVyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG90aGVyW2F0dHJdICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgIGZpcnN0W2F0dHJdID0gb3RoZXJbYXR0cl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaXJzdDtcbiAgICAgIH07XG5cbiAgICAgIFR3aXguZGVmYXVsdHMgPSB7XG4gICAgICAgIHR3ZW50eUZvdXJIb3VyOiBmYWxzZSxcbiAgICAgICAgYWxsRGF5U2ltcGxlOiB7XG4gICAgICAgICAgZm46IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuYWxsRGF5O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNsb3Q6IDAsXG4gICAgICAgICAgcHJlOiBcIiBcIlxuICAgICAgICB9LFxuICAgICAgICBkYXlPZldlZWs6IHtcbiAgICAgICAgICBmbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZm9ybWF0KG9wdGlvbnMud2Vla2RheUZvcm1hdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2xvdDogMSxcbiAgICAgICAgICBwcmU6IFwiIFwiXG4gICAgICAgIH0sXG4gICAgICAgIGFsbERheU1vbnRoOiB7XG4gICAgICAgICAgZm46IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkYXRlLmZvcm1hdChcIlwiICsgb3B0aW9ucy5tb250aEZvcm1hdCArIFwiIFwiICsgb3B0aW9ucy5kYXlGb3JtYXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNsb3Q6IDIsXG4gICAgICAgICAgcHJlOiBcIiBcIlxuICAgICAgICB9LFxuICAgICAgICBtb250aDoge1xuICAgICAgICAgIGZuOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5mb3JtYXQob3B0aW9ucy5tb250aEZvcm1hdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2xvdDogMixcbiAgICAgICAgICBwcmU6IFwiIFwiXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGU6IHtcbiAgICAgICAgICBmbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZm9ybWF0KG9wdGlvbnMuZGF5Rm9ybWF0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzbG90OiAzLFxuICAgICAgICAgIHByZTogXCIgXCJcbiAgICAgICAgfSxcbiAgICAgICAgeWVhcjoge1xuICAgICAgICAgIGZuOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5mb3JtYXQob3B0aW9ucy55ZWFyRm9ybWF0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzbG90OiA0LFxuICAgICAgICAgIHByZTogXCIsIFwiXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWU6IHtcbiAgICAgICAgICBmbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgdmFyIHN0cjtcblxuICAgICAgICAgICAgICBzdHIgPSBkYXRlLm1pbnV0ZXMoKSA9PT0gMCAmJiBvcHRpb25zLmltcGxpY2l0TWludXRlcyAmJiAhb3B0aW9ucy50d2VudHlGb3VySG91ciA/IGRhdGUuZm9ybWF0KG9wdGlvbnMuaG91ckZvcm1hdCkgOiBkYXRlLmZvcm1hdChcIlwiICsgb3B0aW9ucy5ob3VyRm9ybWF0ICsgXCI6XCIgKyBvcHRpb25zLm1pbnV0ZUZvcm1hdCk7XG4gICAgICAgICAgICAgIGlmICghb3B0aW9ucy5ncm91cE1lcmlkaWVtcyAmJiAhb3B0aW9ucy50d2VudHlGb3VySG91cikge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnNwYWNlQmVmb3JlTWVyaWRpZW0pIHtcbiAgICAgICAgICAgICAgICAgIHN0ciArPSBcIiBcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RyICs9IGRhdGUuZm9ybWF0KG9wdGlvbnMubWVyaWRpZW1Gb3JtYXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2xvdDogNSxcbiAgICAgICAgICBwcmU6IFwiLCBcIlxuICAgICAgICB9LFxuICAgICAgICBtZXJpZGllbToge1xuICAgICAgICAgIGZuOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICByZXR1cm4gdC5mb3JtYXQob3B0aW9ucy5tZXJpZGllbUZvcm1hdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2xvdDogNixcbiAgICAgICAgICBwcmU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnNwYWNlQmVmb3JlTWVyaWRpZW0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiIFwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnJlZ2lzdGVyTGFuZyA9IGZ1bmN0aW9uKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIG1vbWVudC5sYW5nKG5hbWUsIHtcbiAgICAgICAgICB0d2l4OiBUd2l4Ll9leHRlbmQoe30sIFR3aXguZGVmYXVsdHMsIG9wdGlvbnMpXG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuaXNTYW1lID0gZnVuY3Rpb24ocGVyaW9kKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXJ0LmlzU2FtZSh0aGlzLmVuZCwgcGVyaW9kKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJ1ZUVuZCh0cnVlKS5kaWZmKHRoaXMuX3RydWVTdGFydCgpLCBwZXJpb2QpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbihwZXJpb2QpIHtcbiAgICAgICAgdmFyIGVuZCwgc3RhcnQ7XG5cbiAgICAgICAgc3RhcnQgPSB0aGlzLnN0YXJ0LmNsb25lKCkuc3RhcnRPZihwZXJpb2QpO1xuICAgICAgICBlbmQgPSB0aGlzLmVuZC5jbG9uZSgpLnN0YXJ0T2YocGVyaW9kKTtcbiAgICAgICAgcmV0dXJuIGVuZC5kaWZmKHN0YXJ0LCBwZXJpb2QpICsgMTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmNvdW50SW5uZXIgPSBmdW5jdGlvbihwZXJpb2QpIHtcbiAgICAgICAgdmFyIGVuZCwgc3RhcnQsIF9yZWY7XG5cbiAgICAgICAgX3JlZiA9IHRoaXMuX2lubmVyKHBlcmlvZCksIHN0YXJ0ID0gX3JlZlswXSwgZW5kID0gX3JlZlsxXTtcbiAgICAgICAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbmQuZGlmZihzdGFydCwgcGVyaW9kKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLml0ZXJhdGUgPSBmdW5jdGlvbihpbnRlcnZhbEFtb3VudCwgcGVyaW9kLCBtaW5Ib3Vycykge1xuICAgICAgICB2YXIgZW5kLCBoYXNOZXh0LCBzdGFydCwgX3JlZixcbiAgICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKGludGVydmFsQW1vdW50ID09IG51bGwpIHtcbiAgICAgICAgICBpbnRlcnZhbEFtb3VudCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgX3JlZiA9IHRoaXMuX3ByZXBJdGVyYXRlSW5wdXRzKGludGVydmFsQW1vdW50LCBwZXJpb2QsIG1pbkhvdXJzKSwgaW50ZXJ2YWxBbW91bnQgPSBfcmVmWzBdLCBwZXJpb2QgPSBfcmVmWzFdLCBtaW5Ib3VycyA9IF9yZWZbMl07XG4gICAgICAgIHN0YXJ0ID0gdGhpcy5zdGFydC5jbG9uZSgpLnN0YXJ0T2YocGVyaW9kKTtcbiAgICAgICAgZW5kID0gdGhpcy5lbmQuY2xvbmUoKS5zdGFydE9mKHBlcmlvZCk7XG4gICAgICAgIGhhc05leHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gc3RhcnQgPD0gZW5kICYmICghbWluSG91cnMgfHwgc3RhcnQudmFsdWVPZigpICE9PSBlbmQudmFsdWVPZigpIHx8IF90aGlzLmVuZC5ob3VycygpID4gbWluSG91cnMgfHwgX3RoaXMuYWxsRGF5KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZXJhdGVIZWxwZXIocGVyaW9kLCBzdGFydCwgaGFzTmV4dCwgaW50ZXJ2YWxBbW91bnQpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuaXRlcmF0ZUlubmVyID0gZnVuY3Rpb24oaW50ZXJ2YWxBbW91bnQsIHBlcmlvZCkge1xuICAgICAgICB2YXIgZW5kLCBoYXNOZXh0LCBzdGFydCwgX3JlZiwgX3JlZjE7XG5cbiAgICAgICAgaWYgKGludGVydmFsQW1vdW50ID09IG51bGwpIHtcbiAgICAgICAgICBpbnRlcnZhbEFtb3VudCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgX3JlZiA9IHRoaXMuX3ByZXBJdGVyYXRlSW5wdXRzKGludGVydmFsQW1vdW50LCBwZXJpb2QpLCBpbnRlcnZhbEFtb3VudCA9IF9yZWZbMF0sIHBlcmlvZCA9IF9yZWZbMV07XG4gICAgICAgIF9yZWYxID0gdGhpcy5faW5uZXIocGVyaW9kLCBpbnRlcnZhbEFtb3VudCksIHN0YXJ0ID0gX3JlZjFbMF0sIGVuZCA9IF9yZWYxWzFdO1xuICAgICAgICBoYXNOZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHN0YXJ0IDwgZW5kO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGhpcy5faXRlcmF0ZUhlbHBlcihwZXJpb2QsIHN0YXJ0LCBoYXNOZXh0LCBpbnRlcnZhbEFtb3VudCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5odW1hbml6ZUxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5hbGxEYXkpIHtcbiAgICAgICAgICBpZiAodGhpcy5pc1NhbWUoXCJkYXlcIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFsbCBkYXlcIjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnQuZnJvbSh0aGlzLmVuZC5jbG9uZSgpLmFkZCgxLCBcImRheVwiKSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0LmZyb20odGhpcy5lbmQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5hc0R1cmF0aW9uID0gZnVuY3Rpb24odW5pdHMpIHtcbiAgICAgICAgdmFyIGRpZmY7XG5cbiAgICAgICAgZGlmZiA9IHRoaXMuZW5kLmRpZmYodGhpcy5zdGFydCk7XG4gICAgICAgIHJldHVybiBtb21lbnQuZHVyYXRpb24oZGlmZik7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5pc1Bhc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZW5kLmNsb25lKCkuZW5kT2YoXCJkYXlcIikgPCBtb21lbnQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5lbmQgPCBtb21lbnQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuaXNGdXR1cmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnQuY2xvbmUoKS5zdGFydE9mKFwiZGF5XCIpID4gbW9tZW50KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnQgPiBtb21lbnQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuaXNDdXJyZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhdGhpcy5pc1Bhc3QoKSAmJiAhdGhpcy5pc0Z1dHVyZSgpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuY29udGFpbnMgPSBmdW5jdGlvbihtb20pIHtcbiAgICAgICAgbW9tID0gbW9tZW50KG1vbSk7XG4gICAgICAgIHJldHVybiB0aGlzLl90cnVlU3RhcnQoKSA8PSBtb20gJiYgdGhpcy5fdHJ1ZUVuZCgpID49IG1vbTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmlzRW1wdHkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RydWVTdGFydCgpLnZhbHVlT2YoKSA9PT0gdGhpcy5fdHJ1ZUVuZCgpLnZhbHVlT2YoKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLm92ZXJsYXBzID0gZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RydWVFbmQoKS5pc0FmdGVyKG90aGVyLl90cnVlU3RhcnQoKSkgJiYgdGhpcy5fdHJ1ZVN0YXJ0KCkuaXNCZWZvcmUob3RoZXIuX3RydWVFbmQoKSk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5lbmd1bGZzID0gZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RydWVTdGFydCgpIDw9IG90aGVyLl90cnVlU3RhcnQoKSAmJiB0aGlzLl90cnVlRW5kKCkgPj0gb3RoZXIuX3RydWVFbmQoKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLnVuaW9uID0gZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgdmFyIGFsbERheSwgbmV3RW5kLCBuZXdTdGFydDtcblxuICAgICAgICBhbGxEYXkgPSB0aGlzLmFsbERheSAmJiBvdGhlci5hbGxEYXk7XG4gICAgICAgIGlmIChhbGxEYXkpIHtcbiAgICAgICAgICBuZXdTdGFydCA9IHRoaXMuc3RhcnQgPCBvdGhlci5zdGFydCA/IHRoaXMuc3RhcnQgOiBvdGhlci5zdGFydDtcbiAgICAgICAgICBuZXdFbmQgPSB0aGlzLmVuZCA+IG90aGVyLmVuZCA/IHRoaXMuZW5kIDogb3RoZXIuZW5kO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5ld1N0YXJ0ID0gdGhpcy5fdHJ1ZVN0YXJ0KCkgPCBvdGhlci5fdHJ1ZVN0YXJ0KCkgPyB0aGlzLl90cnVlU3RhcnQoKSA6IG90aGVyLl90cnVlU3RhcnQoKTtcbiAgICAgICAgICBuZXdFbmQgPSB0aGlzLl90cnVlRW5kKCkgPiBvdGhlci5fdHJ1ZUVuZCgpID8gdGhpcy5fdHJ1ZUVuZCgpIDogb3RoZXIuX3RydWVFbmQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFR3aXgobmV3U3RhcnQsIG5ld0VuZCwgYWxsRGF5KTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHZhciBhbGxEYXksIGVuZCwgbmV3RW5kLCBuZXdTdGFydDtcblxuICAgICAgICBuZXdTdGFydCA9IHRoaXMuc3RhcnQgPiBvdGhlci5zdGFydCA/IHRoaXMuc3RhcnQgOiBvdGhlci5zdGFydDtcbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgZW5kID0gbW9tZW50KHRoaXMuZW5kKTtcbiAgICAgICAgICBlbmQuYWRkKDEsIFwiZGF5XCIpO1xuICAgICAgICAgIGVuZC5zdWJ0cmFjdCgxLCBcIm1pbGxpc2Vjb25kXCIpO1xuICAgICAgICAgIGlmIChvdGhlci5hbGxEYXkpIHtcbiAgICAgICAgICAgIG5ld0VuZCA9IGVuZCA8IG90aGVyLmVuZCA/IHRoaXMuZW5kIDogb3RoZXIuZW5kO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdFbmQgPSBlbmQgPCBvdGhlci5lbmQgPyBlbmQgOiBvdGhlci5lbmQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5ld0VuZCA9IHRoaXMuZW5kIDwgb3RoZXIuZW5kID8gdGhpcy5lbmQgOiBvdGhlci5lbmQ7XG4gICAgICAgIH1cbiAgICAgICAgYWxsRGF5ID0gdGhpcy5hbGxEYXkgJiYgb3RoZXIuYWxsRGF5O1xuICAgICAgICByZXR1cm4gbmV3IFR3aXgobmV3U3RhcnQsIG5ld0VuZCwgYWxsRGF5KTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmlzVmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RydWVTdGFydCgpIDw9IHRoaXMuX3RydWVFbmQoKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAob3RoZXIgaW5zdGFuY2VvZiBUd2l4KSAmJiB0aGlzLmFsbERheSA9PT0gb3RoZXIuYWxsRGF5ICYmIHRoaXMuc3RhcnQudmFsdWVPZigpID09PSBvdGhlci5zdGFydC52YWx1ZU9mKCkgJiYgdGhpcy5lbmQudmFsdWVPZigpID09PSBvdGhlci5lbmQudmFsdWVPZigpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIF9yZWY7XG5cbiAgICAgICAgcmV0dXJuIFwie3N0YXJ0OiBcIiArICh0aGlzLnN0YXJ0LmZvcm1hdCgpKSArIFwiLCBlbmQ6IFwiICsgKHRoaXMuZW5kLmZvcm1hdCgpKSArIFwiLCBhbGxEYXk6IFwiICsgKChfcmVmID0gdGhpcy5hbGxEYXkpICE9IG51bGwgPyBfcmVmIDoge1xuICAgICAgICAgIFwidHJ1ZVwiOiBcImZhbHNlXCJcbiAgICAgICAgfSkgKyBcIn1cIjtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLnNpbXBsZUZvcm1hdCA9IGZ1bmN0aW9uKG1vbWVudE9wdHMsIGlub3B0cykge1xuICAgICAgICB2YXIgb3B0aW9ucywgcztcblxuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgIGFsbERheTogXCIoYWxsIGRheSlcIixcbiAgICAgICAgICB0ZW1wbGF0ZTogVHdpeC5mb3JtYXRUZW1wbGF0ZVxuICAgICAgICB9O1xuICAgICAgICBUd2l4Ll9leHRlbmQob3B0aW9ucywgaW5vcHRzIHx8IHt9KTtcbiAgICAgICAgcyA9IG9wdGlvbnMudGVtcGxhdGUodGhpcy5zdGFydC5mb3JtYXQobW9tZW50T3B0cyksIHRoaXMuZW5kLmZvcm1hdChtb21lbnRPcHRzKSk7XG4gICAgICAgIGlmICh0aGlzLmFsbERheSAmJiBvcHRpb25zLmFsbERheSkge1xuICAgICAgICAgIHMgKz0gXCIgXCIgKyBvcHRpb25zLmFsbERheTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcztcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKGlub3B0cykge1xuICAgICAgICB2YXIgY29tbW9uX2J1Y2tldCwgZW5kX2J1Y2tldCwgZm9sZCwgZm9ybWF0LCBmcywgZ2xvYmFsX2ZpcnN0LCBnb2VzSW50b1RoZU1vcm5pbmcsIG5lZWREYXRlLCBvcHRpb25zLCBwcm9jZXNzLCBzdGFydF9idWNrZXQsIHRvZ2V0aGVyLCBfaSwgX2xlbixcbiAgICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5fbGF6eUxhbmcoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNFbXB0eSgpKSB7XG4gICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICBncm91cE1lcmlkaWVtczogdHJ1ZSxcbiAgICAgICAgICBzcGFjZUJlZm9yZU1lcmlkaWVtOiB0cnVlLFxuICAgICAgICAgIHNob3dEYXRlOiB0cnVlLFxuICAgICAgICAgIHNob3dEYXlPZldlZWs6IGZhbHNlLFxuICAgICAgICAgIHR3ZW50eUZvdXJIb3VyOiB0aGlzLmxhbmdEYXRhLnR3ZW50eUZvdXJIb3VyLFxuICAgICAgICAgIGltcGxpY2l0TWludXRlczogdHJ1ZSxcbiAgICAgICAgICBpbXBsaWNpdFllYXI6IHRydWUsXG4gICAgICAgICAgeWVhckZvcm1hdDogXCJZWVlZXCIsXG4gICAgICAgICAgbW9udGhGb3JtYXQ6IFwiTU1NXCIsXG4gICAgICAgICAgd2Vla2RheUZvcm1hdDogXCJkZGRcIixcbiAgICAgICAgICBkYXlGb3JtYXQ6IFwiRFwiLFxuICAgICAgICAgIG1lcmlkaWVtRm9ybWF0OiBcIkFcIixcbiAgICAgICAgICBob3VyRm9ybWF0OiBcImhcIixcbiAgICAgICAgICBtaW51dGVGb3JtYXQ6IFwibW1cIixcbiAgICAgICAgICBhbGxEYXk6IFwiYWxsIGRheVwiLFxuICAgICAgICAgIGV4cGxpY2l0QWxsRGF5OiBmYWxzZSxcbiAgICAgICAgICBsYXN0TmlnaHRFbmRzQXQ6IDAsXG4gICAgICAgICAgdGVtcGxhdGU6IFR3aXguZm9ybWF0VGVtcGxhdGVcbiAgICAgICAgfTtcbiAgICAgICAgVHdpeC5fZXh0ZW5kKG9wdGlvbnMsIGlub3B0cyB8fCB7fSk7XG4gICAgICAgIGZzID0gW107XG4gICAgICAgIGlmIChvcHRpb25zLnR3ZW50eUZvdXJIb3VyKSB7XG4gICAgICAgICAgb3B0aW9ucy5ob3VyRm9ybWF0ID0gb3B0aW9ucy5ob3VyRm9ybWF0LnJlcGxhY2UoXCJoXCIsIFwiSFwiKTtcbiAgICAgICAgfVxuICAgICAgICBnb2VzSW50b1RoZU1vcm5pbmcgPSBvcHRpb25zLmxhc3ROaWdodEVuZHNBdCA+IDAgJiYgIXRoaXMuYWxsRGF5ICYmIHRoaXMuZW5kLmNsb25lKCkuc3RhcnRPZihcImRheVwiKS52YWx1ZU9mKCkgPT09IHRoaXMuc3RhcnQuY2xvbmUoKS5hZGQoMSwgXCJkYXlcIikuc3RhcnRPZihcImRheVwiKS52YWx1ZU9mKCkgJiYgdGhpcy5zdGFydC5ob3VycygpID4gMTIgJiYgdGhpcy5lbmQuaG91cnMoKSA8IG9wdGlvbnMubGFzdE5pZ2h0RW5kc0F0O1xuICAgICAgICBuZWVkRGF0ZSA9IG9wdGlvbnMuc2hvd0RhdGUgfHwgKCF0aGlzLmlzU2FtZShcImRheVwiKSAmJiAhZ29lc0ludG9UaGVNb3JuaW5nKTtcbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5ICYmIHRoaXMuaXNTYW1lKFwiZGF5XCIpICYmICghb3B0aW9ucy5zaG93RGF0ZSB8fCBvcHRpb25zLmV4cGxpY2l0QWxsRGF5KSkge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJhbGwgZGF5IHNpbXBsZVwiLFxuICAgICAgICAgICAgZm46IHRoaXMuX2Zvcm1hdEZuKCdhbGxEYXlTaW1wbGUnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHByZTogdGhpcy5fZm9ybWF0UHJlKCdhbGxEYXlTaW1wbGUnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHNsb3Q6IHRoaXMuX2Zvcm1hdFNsb3QoJ2FsbERheVNpbXBsZScpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5lZWREYXRlICYmICghb3B0aW9ucy5pbXBsaWNpdFllYXIgfHwgdGhpcy5zdGFydC55ZWFyKCkgIT09IG1vbWVudCgpLnllYXIoKSB8fCAhdGhpcy5pc1NhbWUoXCJ5ZWFyXCIpKSkge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJ5ZWFyXCIsXG4gICAgICAgICAgICBmbjogdGhpcy5fZm9ybWF0Rm4oJ3llYXInLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHByZTogdGhpcy5fZm9ybWF0UHJlKCd5ZWFyJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCd5ZWFyJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuYWxsRGF5ICYmIG5lZWREYXRlKSB7XG4gICAgICAgICAgZnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBcImFsbCBkYXkgbW9udGhcIixcbiAgICAgICAgICAgIGZuOiB0aGlzLl9mb3JtYXRGbignYWxsRGF5TW9udGgnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIGlnbm9yZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBnb2VzSW50b1RoZU1vcm5pbmc7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJlOiB0aGlzLl9mb3JtYXRQcmUoJ2FsbERheU1vbnRoJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCdhbGxEYXlNb250aCcpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5ICYmIG5lZWREYXRlKSB7XG4gICAgICAgICAgZnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBcIm1vbnRoXCIsXG4gICAgICAgICAgICBmbjogdGhpcy5fZm9ybWF0Rm4oJ21vbnRoJywgb3B0aW9ucyksXG4gICAgICAgICAgICBwcmU6IHRoaXMuX2Zvcm1hdFByZSgnbW9udGgnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHNsb3Q6IHRoaXMuX2Zvcm1hdFNsb3QoJ21vbnRoJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5hbGxEYXkgJiYgbmVlZERhdGUpIHtcbiAgICAgICAgICBmcy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IFwiZGF0ZVwiLFxuICAgICAgICAgICAgZm46IHRoaXMuX2Zvcm1hdEZuKCdkYXRlJywgb3B0aW9ucyksXG4gICAgICAgICAgICBwcmU6IHRoaXMuX2Zvcm1hdFByZSgnZGF0ZScsIG9wdGlvbnMpLFxuICAgICAgICAgICAgc2xvdDogdGhpcy5fZm9ybWF0U2xvdCgnZGF0ZScpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5lZWREYXRlICYmIG9wdGlvbnMuc2hvd0RheU9mV2Vlaykge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJkYXkgb2Ygd2Vla1wiLFxuICAgICAgICAgICAgZm46IHRoaXMuX2Zvcm1hdEZuKCdkYXlPZldlZWsnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHByZTogdGhpcy5fZm9ybWF0UHJlKCdkYXlPZldlZWsnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHNsb3Q6IHRoaXMuX2Zvcm1hdFNsb3QoJ2RheU9mV2VlaycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuZ3JvdXBNZXJpZGllbXMgJiYgIW9wdGlvbnMudHdlbnR5Rm91ckhvdXIgJiYgIXRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgZnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBcIm1lcmlkaWVtXCIsXG4gICAgICAgICAgICBmbjogdGhpcy5fZm9ybWF0Rm4oJ21lcmlkaWVtJywgb3B0aW9ucyksXG4gICAgICAgICAgICBwcmU6IHRoaXMuX2Zvcm1hdFByZSgnbWVyaWRpZW0nLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHNsb3Q6IHRoaXMuX2Zvcm1hdFNsb3QoJ21lcmlkaWVtJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgZnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBcInRpbWVcIixcbiAgICAgICAgICAgIGZuOiB0aGlzLl9mb3JtYXRGbigndGltZScsIG9wdGlvbnMpLFxuICAgICAgICAgICAgcHJlOiB0aGlzLl9mb3JtYXRQcmUoJ3RpbWUnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHNsb3Q6IHRoaXMuX2Zvcm1hdFNsb3QoJ3RpbWUnKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHN0YXJ0X2J1Y2tldCA9IFtdO1xuICAgICAgICBlbmRfYnVja2V0ID0gW107XG4gICAgICAgIGNvbW1vbl9idWNrZXQgPSBbXTtcbiAgICAgICAgdG9nZXRoZXIgPSB0cnVlO1xuICAgICAgICBwcm9jZXNzID0gZnVuY3Rpb24oZm9ybWF0KSB7XG4gICAgICAgICAgdmFyIGVuZF9zdHIsIHN0YXJ0X2dyb3VwLCBzdGFydF9zdHI7XG5cbiAgICAgICAgICBzdGFydF9zdHIgPSBmb3JtYXQuZm4oX3RoaXMuc3RhcnQpO1xuICAgICAgICAgIGVuZF9zdHIgPSBmb3JtYXQuaWdub3JlRW5kICYmIGZvcm1hdC5pZ25vcmVFbmQoKSA/IHN0YXJ0X3N0ciA6IGZvcm1hdC5mbihfdGhpcy5lbmQpO1xuICAgICAgICAgIHN0YXJ0X2dyb3VwID0ge1xuICAgICAgICAgICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzdGFydF9zdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoZW5kX3N0ciA9PT0gc3RhcnRfc3RyICYmIHRvZ2V0aGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gY29tbW9uX2J1Y2tldC5wdXNoKHN0YXJ0X2dyb3VwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRvZ2V0aGVyKSB7XG4gICAgICAgICAgICAgIHRvZ2V0aGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgIGNvbW1vbl9idWNrZXQucHVzaCh7XG4gICAgICAgICAgICAgICAgZm9ybWF0OiB7XG4gICAgICAgICAgICAgICAgICBzbG90OiBmb3JtYXQuc2xvdCxcbiAgICAgICAgICAgICAgICAgIHByZTogXCJcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMudGVtcGxhdGUoZm9sZChzdGFydF9idWNrZXQpLCBmb2xkKGVuZF9idWNrZXQsIHRydWUpLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXJ0X2J1Y2tldC5wdXNoKHN0YXJ0X2dyb3VwKTtcbiAgICAgICAgICAgIHJldHVybiBlbmRfYnVja2V0LnB1c2goe1xuICAgICAgICAgICAgICBmb3JtYXQ6IGZvcm1hdCxcbiAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbmRfc3RyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGZvciAoX2kgPSAwLCBfbGVuID0gZnMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgICBmb3JtYXQgPSBmc1tfaV07XG4gICAgICAgICAgcHJvY2Vzcyhmb3JtYXQpO1xuICAgICAgICB9XG4gICAgICAgIGdsb2JhbF9maXJzdCA9IHRydWU7XG4gICAgICAgIGZvbGQgPSBmdW5jdGlvbihhcnJheSwgc2tpcF9wcmUpIHtcbiAgICAgICAgICB2YXIgbG9jYWxfZmlyc3QsIHNlY3Rpb24sIHN0ciwgX2osIF9sZW4xLCBfcmVmO1xuXG4gICAgICAgICAgbG9jYWxfZmlyc3QgPSB0cnVlO1xuICAgICAgICAgIHN0ciA9IFwiXCI7XG4gICAgICAgICAgX3JlZiA9IGFycmF5LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEuZm9ybWF0LnNsb3QgLSBiLmZvcm1hdC5zbG90O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGZvciAoX2ogPSAwLCBfbGVuMSA9IF9yZWYubGVuZ3RoOyBfaiA8IF9sZW4xOyBfaisrKSB7XG4gICAgICAgICAgICBzZWN0aW9uID0gX3JlZltfal07XG4gICAgICAgICAgICBpZiAoIWdsb2JhbF9maXJzdCkge1xuICAgICAgICAgICAgICBpZiAobG9jYWxfZmlyc3QgJiYgc2tpcF9wcmUpIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gXCIgXCI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IHNlY3Rpb24uZm9ybWF0LnByZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RyICs9IHNlY3Rpb24udmFsdWUoKTtcbiAgICAgICAgICAgIGdsb2JhbF9maXJzdCA9IGZhbHNlO1xuICAgICAgICAgICAgbG9jYWxfZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZvbGQoY29tbW9uX2J1Y2tldCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5fdHJ1ZVN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbERheSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0LmNsb25lKCkuc3RhcnRPZihcImRheVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zdGFydC5jbG9uZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5fdHJ1ZUVuZCA9IGZ1bmN0aW9uKGRpZmZhYmxlRW5kKSB7XG4gICAgICAgIGlmIChkaWZmYWJsZUVuZCA9PSBudWxsKSB7XG4gICAgICAgICAgZGlmZmFibGVFbmQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5hbGxEYXkpIHtcbiAgICAgICAgICBpZiAoZGlmZmFibGVFbmQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVuZC5jbG9uZSgpLmFkZCgxLCBcImRheVwiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5kLmNsb25lKCkuZW5kT2YoXCJkYXlcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmVuZC5jbG9uZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5faXRlcmF0ZUhlbHBlciA9IGZ1bmN0aW9uKHBlcmlvZCwgaXRlciwgaGFzTmV4dCwgaW50ZXJ2YWxBbW91bnQpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICBpZiAoaW50ZXJ2YWxBbW91bnQgPT0gbnVsbCkge1xuICAgICAgICAgIGludGVydmFsQW1vdW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHZhbDtcblxuICAgICAgICAgICAgaWYgKCFoYXNOZXh0KCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YWwgPSBpdGVyLmNsb25lKCk7XG4gICAgICAgICAgICAgIGl0ZXIuYWRkKGludGVydmFsQW1vdW50LCBwZXJpb2QpO1xuICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFzTmV4dDogaGFzTmV4dFxuICAgICAgICB9O1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX3ByZXBJdGVyYXRlSW5wdXRzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpbnB1dHMsIGludGVydmFsQW1vdW50LCBtaW5Ib3VycywgcGVyaW9kLCBfcmVmLCBfcmVmMTtcblxuICAgICAgICBpbnB1dHMgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgICAgICBpZiAodHlwZW9mIGlucHV0c1swXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICByZXR1cm4gaW5wdXRzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgaW5wdXRzWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHBlcmlvZCA9IGlucHV0cy5zaGlmdCgpO1xuICAgICAgICAgIGludGVydmFsQW1vdW50ID0gKF9yZWYgPSBpbnB1dHMucG9wKCkpICE9IG51bGwgPyBfcmVmIDogMTtcbiAgICAgICAgICBpZiAoaW5wdXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgbWluSG91cnMgPSAoX3JlZjEgPSBpbnB1dHNbMF0pICE9IG51bGwgPyBfcmVmMSA6IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobW9tZW50LmlzRHVyYXRpb24oaW5wdXRzWzBdKSkge1xuICAgICAgICAgIHBlcmlvZCA9ICdtaWxsaXNlY29uZHMnO1xuICAgICAgICAgIGludGVydmFsQW1vdW50ID0gaW5wdXRzWzBdLmFzKHBlcmlvZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtpbnRlcnZhbEFtb3VudCwgcGVyaW9kLCBtaW5Ib3Vyc107XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5faW5uZXIgPSBmdW5jdGlvbihwZXJpb2QsIGludGVydmFsQW1vdW50KSB7XG4gICAgICAgIHZhciBkdXJhdGlvbkNvdW50LCBkdXJhdGlvblBlcmlvZCwgZW5kLCBtb2R1bHVzLCBzdGFydDtcblxuICAgICAgICBpZiAocGVyaW9kID09IG51bGwpIHtcbiAgICAgICAgICBwZXJpb2QgPSBcIm1pbGxpc2Vjb25kc1wiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnRlcnZhbEFtb3VudCA9PSBudWxsKSB7XG4gICAgICAgICAgaW50ZXJ2YWxBbW91bnQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIHN0YXJ0ID0gdGhpcy5fdHJ1ZVN0YXJ0KCk7XG4gICAgICAgIGVuZCA9IHRoaXMuX3RydWVFbmQodHJ1ZSk7XG4gICAgICAgIGlmIChzdGFydCA+IHN0YXJ0LmNsb25lKCkuc3RhcnRPZihwZXJpb2QpKSB7XG4gICAgICAgICAgc3RhcnQuc3RhcnRPZihwZXJpb2QpLmFkZChpbnRlcnZhbEFtb3VudCwgcGVyaW9kKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5kIDwgZW5kLmNsb25lKCkuZW5kT2YocGVyaW9kKSkge1xuICAgICAgICAgIGVuZC5zdGFydE9mKHBlcmlvZCk7XG4gICAgICAgIH1cbiAgICAgICAgZHVyYXRpb25QZXJpb2QgPSBzdGFydC50d2l4KGVuZCkuYXNEdXJhdGlvbihwZXJpb2QpO1xuICAgICAgICBkdXJhdGlvbkNvdW50ID0gZHVyYXRpb25QZXJpb2QuZ2V0KHBlcmlvZCk7XG4gICAgICAgIG1vZHVsdXMgPSBkdXJhdGlvbkNvdW50ICUgaW50ZXJ2YWxBbW91bnQ7XG4gICAgICAgIGVuZC5zdWJ0cmFjdChtb2R1bHVzLCBwZXJpb2QpO1xuICAgICAgICByZXR1cm4gW3N0YXJ0LCBlbmRdO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX2xhenlMYW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlLCBsYW5nRGF0YSwgbGFuZ3VhZ2VzLCBfcmVmO1xuXG4gICAgICAgIGxhbmdEYXRhID0gdGhpcy5zdGFydC5sYW5nKCk7XG4gICAgICAgIGlmICgobGFuZ0RhdGEgIT0gbnVsbCkgJiYgdGhpcy5lbmQubGFuZygpLl9hYmJyICE9PSBsYW5nRGF0YS5fYWJicikge1xuICAgICAgICAgIHRoaXMuZW5kLmxhbmcobGFuZ0RhdGEuX2FiYnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgodGhpcy5sYW5nRGF0YSAhPSBudWxsKSAmJiB0aGlzLmxhbmdEYXRhLl9hYmJyID09PSBsYW5nRGF0YS5fYWJicikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzTW9kdWxlICYmICEobGFuZ3VhZ2VzTG9hZGVkIHx8IGxhbmdEYXRhLl9hYmJyID09PSBcImVuXCIpKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxhbmd1YWdlcyA9IHJlcXVpcmUoXCIuL2xhbmdcIik7XG4gICAgICAgICAgICBsYW5ndWFnZXMobW9tZW50LCBUd2l4KTtcbiAgICAgICAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgICAgICAgIGUgPSBfZXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhbmd1YWdlc0xvYWRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubGFuZ0RhdGEgPSAoX3JlZiA9IGxhbmdEYXRhICE9IG51bGwgPyBsYW5nRGF0YS5fdHdpeCA6IHZvaWQgMCkgIT0gbnVsbCA/IF9yZWYgOiBUd2l4LmRlZmF1bHRzO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX2Zvcm1hdEZuID0gZnVuY3Rpb24obmFtZSwgb3B0aW9ucykge1xuICAgICAgICByZXR1cm4gdGhpcy5sYW5nRGF0YVtuYW1lXS5mbihvcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLl9mb3JtYXRTbG90ID0gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5sYW5nRGF0YVtuYW1lXS5zbG90O1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX2Zvcm1hdFByZSA9IGZ1bmN0aW9uKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmxhbmdEYXRhW25hbWVdLnByZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMubGFuZ0RhdGFbbmFtZV0ucHJlKG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmxhbmdEYXRhW25hbWVdLnByZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuc2FtZURheSA9IGRlcHJlY2F0ZShcInNhbWVEYXlcIiwgXCJpc1NhbWUoJ2RheScpXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1NhbWUoXCJkYXlcIik7XG4gICAgICB9KTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuc2FtZVllYXIgPSBkZXByZWNhdGUoXCJzYW1lWWVhclwiLCBcImlzU2FtZSgneWVhcicpXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1NhbWUoXCJ5ZWFyXCIpO1xuICAgICAgfSk7XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmNvdW50RGF5cyA9IGRlcHJlY2F0ZShcImNvdW50RGF5c1wiLCBcImNvdW50T3V0ZXIoJ2RheXMnKVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY291bnRPdXRlcihcImRheXNcIik7XG4gICAgICB9KTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuZGF5c0luID0gZGVwcmVjYXRlKFwiZGF5c0luXCIsIFwiaXRlcmF0ZSgnZGF5cycgWyxtaW5Ib3Vyc10pXCIsIGZ1bmN0aW9uKG1pbkhvdXJzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLml0ZXJhdGUoJ2RheXMnLCBtaW5Ib3Vycyk7XG4gICAgICB9KTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUucGFzdCA9IGRlcHJlY2F0ZShcInBhc3RcIiwgXCJpc1Bhc3QoKVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNQYXN0KCk7XG4gICAgICB9KTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuZHVyYXRpb24gPSBkZXByZWNhdGUoXCJkdXJhdGlvblwiLCBcImh1bWFuaXplTGVuZ3RoKClcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuaXplTGVuZ3RoKCk7XG4gICAgICB9KTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUubWVyZ2UgPSBkZXByZWNhdGUoXCJtZXJnZVwiLCBcInVuaW9uKG90aGVyKVwiLCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gdGhpcy51bmlvbihvdGhlcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIFR3aXg7XG5cbiAgICB9KSgpO1xuICAgIGdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24obykge1xuICAgICAgaWYgKHR5cGVvZiBPYmplY3QuZ2V0UHJvdG90eXBlT2YgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pO1xuICAgICAgfSBlbHNlIGlmIChcIlwiLl9fcHJvdG9fXyA9PT0gU3RyaW5nLnByb3RvdHlwZSkge1xuICAgICAgICByZXR1cm4gby5fX3Byb3RvX187XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gby5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICB9XG4gICAgfTtcbiAgICBUd2l4Ll9leHRlbmQoZ2V0UHJvdG90eXBlT2YobW9tZW50LmZuLl9sYW5nKSwge1xuICAgICAgX3R3aXg6IFR3aXguZGVmYXVsdHNcbiAgICB9KTtcbiAgICBUd2l4LmZvcm1hdFRlbXBsYXRlID0gZnVuY3Rpb24obGVmdFNpZGUsIHJpZ2h0U2lkZSkge1xuICAgICAgcmV0dXJuIFwiXCIgKyBsZWZ0U2lkZSArIFwiIC0gXCIgKyByaWdodFNpZGU7XG4gICAgfTtcbiAgICBtb21lbnQudHdpeCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChmdW5jdGlvbihmdW5jLCBhcmdzLCBjdG9yKSB7XG4gICAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyBjdG9yLCByZXN1bHQgPSBmdW5jLmFwcGx5KGNoaWxkLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdChyZXN1bHQpID09PSByZXN1bHQgPyByZXN1bHQgOiBjaGlsZDtcbiAgICAgIH0pKFR3aXgsIGFyZ3VtZW50cywgZnVuY3Rpb24oKXt9KTtcbiAgICB9O1xuICAgIG1vbWVudC5mbi50d2l4ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGZ1bmN0aW9uKGZ1bmMsIGFyZ3MsIGN0b3IpIHtcbiAgICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgICAgdmFyIGNoaWxkID0gbmV3IGN0b3IsIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY2hpbGQsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCA/IHJlc3VsdCA6IGNoaWxkO1xuICAgICAgfSkoVHdpeCwgW3RoaXNdLmNvbmNhdChfX3NsaWNlLmNhbGwoYXJndW1lbnRzKSksIGZ1bmN0aW9uKCl7fSk7XG4gICAgfTtcbiAgICBtb21lbnQuZm4uZm9yRHVyYXRpb24gPSBmdW5jdGlvbihkdXJhdGlvbiwgYWxsRGF5KSB7XG4gICAgICByZXR1cm4gbmV3IFR3aXgodGhpcywgdGhpcy5jbG9uZSgpLmFkZChkdXJhdGlvbiksIGFsbERheSk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYWZ0ZXJNb21lbnQgPSBmdW5jdGlvbihzdGFydGluZ1RpbWUsIGFsbERheSkge1xuICAgICAgcmV0dXJuIG5ldyBUd2l4KHN0YXJ0aW5nVGltZSwgbW9tZW50KHN0YXJ0aW5nVGltZSkuY2xvbmUoKS5hZGQodGhpcyksIGFsbERheSk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYmVmb3JlTW9tZW50ID0gZnVuY3Rpb24oc3RhcnRpbmdUaW1lLCBhbGxEYXkpIHtcbiAgICAgIHJldHVybiBuZXcgVHdpeChtb21lbnQoc3RhcnRpbmdUaW1lKS5jbG9uZSgpLnN1YnRyYWN0KHRoaXMpLCBzdGFydGluZ1RpbWUsIGFsbERheSk7XG4gICAgfTtcbiAgICBtb21lbnQudHdpeENsYXNzID0gVHdpeDtcbiAgICByZXR1cm4gVHdpeDtcbiAgfTtcblxuICBpZiAoaGFzTW9kdWxlKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBtYWtlVHdpeChyZXF1aXJlKFwibW9tZW50XCIpKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBkZWZpbmUoXCJ0d2l4XCIsIFtcIm1vbWVudFwiXSwgZnVuY3Rpb24obW9tZW50KSB7XG4gICAgICByZXR1cm4gbWFrZVR3aXgobW9tZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0aGlzLm1vbWVudCAhPSBudWxsKSB7XG4gICAgdGhpcy5Ud2l4ID0gbWFrZVR3aXgodGhpcy5tb21lbnQpO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gIGdycGggPSB7fTtcbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX2NhdGVnb3JpY2FsKCkge1xuXG4gIHZhciBzY2FsZSA9IGdycGhfc2NhbGVfY2F0ZWdvcmljYWwoKTtcbiAgdmFyIHdpZHRoO1xuICB2YXIgdmFyaWFibGUsIGhlaWdodDtcbiAgdmFyIHRpY2tfZm9ybWF0ID0gZnVuY3Rpb24oeCl7cmV0dXJuIHg7fTtcblxuICB2YXIgZHVtbXlfID0gZDMuc2VsZWN0KFwiYm9keVwiKS5hcHBlbmQoXCJzdmdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsIFwiYXhpc19jYXRlZ29yaWNhbCBkdW1teVwiKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgMCkuYXR0cihcImhlaWdodFwiLCAwKVxuICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gIHZhciBsYWJlbF9zaXplXyA9IGdycGhfbGFiZWxfc2l6ZShkdW1teV8pO1xuXG4gIGZ1bmN0aW9uIGF4aXMoZykge1xuICAgIHZhciB0aWNrcyA9IGF4aXMudGlja3MoKTtcbiAgICBnLmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsIFwiYmFja2dyb3VuZFwiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBheGlzLndpZHRoKCkpLmF0dHIoXCJoZWlnaHRcIiwgYXhpcy5oZWlnaHQoKSk7XG4gICAgZy5zZWxlY3RBbGwoXCIudGlja1wiKS5kYXRhKHRpY2tzKS5lbnRlcigpXG4gICAgICAuYXBwZW5kKFwibGluZVwiKS5hdHRyKFwiY2xhc3NcIiwgXCJ0aWNrc1wiKVxuICAgICAgLmF0dHIoXCJ4MVwiLCBheGlzLndpZHRoKCkgLSBzZXR0aW5ncyhcInRpY2tfbGVuZ3RoXCIpKVxuICAgICAgLmF0dHIoXCJ4MlwiLCBheGlzLndpZHRoKCkpXG4gICAgICAuYXR0cihcInkxXCIsIHNjYWxlLm0pLmF0dHIoXCJ5MlwiLCBzY2FsZS5tKTtcbiAgICBnLnNlbGVjdEFsbChcIi50aWNrbGFiZWxcIikuZGF0YSh0aWNrcykuZW50ZXIoKVxuICAgICAgLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwidGlja2xhYmVsXCIpXG4gICAgICAuYXR0cihcInhcIiwgYXhpcy53aWR0aCgpIC0gc2V0dGluZ3MoXCJ0aWNrX2xlbmd0aFwiKSAtIHNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKVxuICAgICAgLmF0dHIoXCJ5XCIsIHNjYWxlLm0pXG4gICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiB0aWNrX2Zvcm1hdChkKTt9KVxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuICAgICAgLmF0dHIoXCJkeVwiLCBcIjAuMzVlbVwiKTtcbiAgICBnLmFwcGVuZChcImxpbmVcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpc2xpbmVcIilcbiAgICAgIC5hdHRyKFwieDFcIiwgYXhpcy53aWR0aCgpKS5hdHRyKFwieDJcIiwgYXhpcy53aWR0aCgpKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKS4gYXR0cihcInkyXCIsIGF4aXMuaGVpZ2h0KCkpO1xuICB9XG5cbiAgYXhpcy53aWR0aCA9IGZ1bmN0aW9uKHcpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIHRpY2tzID0gc2NhbGUudGlja3MoKTtcbiAgICAgIHZhciBtYXhfd2lkdGggPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgbHcgPSBsYWJlbF9zaXplXy53aWR0aCh0aWNrX2Zvcm1hdCh0aWNrc1tpXSkpO1xuICAgICAgICBpZiAobHcgPiBtYXhfd2lkdGgpIG1heF93aWR0aCA9IGx3O1xuICAgICAgfVxuICAgICAgd2lkdGggPSBtYXhfd2lkdGggKyBzZXR0aW5ncyhcInRpY2tfbGVuZ3RoXCIpICsgc2V0dGluZ3MoXCJ0aWNrX3BhZGRpbmdcIik7XG4gICAgICByZXR1cm4gd2lkdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpZHRoID0gdztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmhlaWdodCA9IGZ1bmN0aW9uKGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgaGVpZ2h0ID0gaDtcbiAgICAgIHNjYWxlLnJhbmdlKFswLCBoXSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSAnc3RyaW5nJyB8fCB2c2NoZW1hLnR5cGUgPT0gJ2NhdGVnb3JpY2FsJyB8fFxuICAgICAgdnNjaGVtYS50eXBlID09ICdwZXJpb2QnO1xuICB9O1xuXG4gIGF4aXMudmFyaWFibGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB2YXJpYWJsZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGUgPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuZG9tYWluID0gZnVuY3Rpb24oZGF0YSwgc2NoZW1hKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzY2FsZS5kb21haW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHZhcmlhYmxlID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgICB2YXIgZG9tYWluID0gW107XG4gICAgICBpZiAodnNjaGVtYS50eXBlID09IFwiY2F0ZWdvcmljYWxcIikge1xuICAgICAgICBkb21haW4gPSB2c2NoZW1hLmNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZTsgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZCA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRbdmFyaWFibGVdO30pO1xuICAgICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGR1cGxpY2F0ZSB2YWx1ZXNcbiAgICAgICAgZG9tYWluID0gZC5maWx0ZXIoZnVuY3Rpb24odmFsdWUsIGluZGV4LCBzZWxmKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuaW5kZXhPZih2YWx1ZSkgPT09IGluZGV4O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRpY2tfZm9ybWF0ID0gdmFyaWFibGVfdmFsdWVfZm9ybWF0dGVyKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgICAgc2NhbGUuZG9tYWluKGRvbWFpbik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzY2FsZS50aWNrcygpO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKHR5cGVvZiB2ID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gc2NhbGUodlt2YXJpYWJsZV0pLm07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZSh2KS5tO1xuICAgIH1cbiAgfTtcblxuICBheGlzLnNjYWxlLmwgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKHR5cGVvZiB2ID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gc2NhbGUodlt2YXJpYWJsZV0pLmw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZSh2KS5sO1xuICAgIH1cbiAgfTtcblxuICBheGlzLnNjYWxlLnUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKHR5cGVvZiB2ID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gc2NhbGUodlt2YXJpYWJsZV0pLnU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZSh2KS51O1xuICAgIH1cbiAgfTtcblxuICBheGlzLnNjYWxlLncgPSBmdW5jdGlvbih2KSB7XG4gICAgdmFyIHI7XG4gICAgaWYgKHR5cGVvZiB2ID09ICdvYmplY3QnKSB7XG4gICAgICByID0gc2NhbGUodlt2YXJpYWJsZV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByID0gc2NhbGUodik7XG4gICAgfVxuICAgIHJldHVybiByLnUgLSByLmw7XG4gIH07XG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmlmIChncnBoLmF4aXMgPT09IHVuZGVmaW5lZCkgZ3JwaC5heGlzID0ge307XG5ncnBoLmF4aXMuY2F0ZWdvcmljYWwgPSBncnBoX2F4aXNfY2F0ZWdvcmljYWwoKTtcbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX2NobG9yb3BsZXRoKCkge1xuXG4gIHZhciB2YXJpYWJsZTtcbiAgdmFyIHdpZHRoLCBoZWlnaHQ7XG4gIHZhciBzY2FsZSA9IGdycGhfc2NhbGVfY2hsb3JvcGxldGgoKTtcblxuICBmdW5jdGlvbiBheGlzKGcpIHtcbiAgfVxuXG4gIGF4aXMud2lkdGggPSBmdW5jdGlvbih3KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB3aWR0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGggPSB3O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICBoZWlnaHQgPSBoO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuYWNjZXB0ID0gZnVuY3Rpb24odmFyaWFibGUsIHNjaGVtYSkge1xuICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgIHJldHVybiB2c2NoZW1hLnR5cGUgPT0gJ251bWJlcic7XG4gIH07XG5cbiAgYXhpcy52YXJpYWJsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhcmlhYmxlO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZSA9IHY7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNjYWxlLmRvbWFpbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodmFyaWFibGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXM7XG4gICAgICBzY2FsZS5kb21haW4oZDMuZXh0ZW50KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRbdmFyaWFibGVdO30pKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNjYWxlLnRpY2tzKCk7XG4gIH07XG5cbiAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT0gJ29iamVjdCcpIHsgXG4gICAgICByZXR1cm4gYXhpcy5zY2FsZSh2W3ZhcmlhYmxlXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZSh2KTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmlmIChncnBoLmF4aXMgPT09IHVuZGVmaW5lZCkgZ3JwaC5heGlzID0ge307XG5ncnBoLmF4aXMuY2hsb3JvcGxldGggPSBncnBoX2F4aXNfY2hsb3JvcGxldGgoKTtcblxuIiwiXG5mdW5jdGlvbiBncnBoX2F4aXNfY29sb3VyKCkge1xuXG4gIHZhciBzY2FsZSA9IGdycGhfc2NhbGVfY29sb3VyKCk7XG4gIHZhciB2YXJpYWJsZV87XG4gIHZhciB3aWR0aF8sIGhlaWdodF87XG5cbiAgZnVuY3Rpb24gYXhpcyhnKSB7XG4gIH1cblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHdpZHRoXztcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGhfID0gd2lkdGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoZWlnaHQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodF87XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIgfHwgdnNjaGVtYS50eXBlID09IFwicGVyaW9kXCI7XG4gIH07XG5cbiAgYXhpcy52YXJpYWJsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhcmlhYmxlXztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGVfID0gdjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmRvbWFpbiA9IGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2NhbGUuZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2YXJpYWJsZV8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzY2FsZS5kb21haW4odW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IFtdO1xuICAgICAgaWYgKHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIpIHtcbiAgICAgICAgY2F0ZWdvcmllcyA9IHZzY2hlbWEuY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lOyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWxzID0gZGF0YS5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZFt2YXJpYWJsZV9dO30pLnNvcnQoKTtcbiAgICAgICAgdmFyIHByZXY7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFscy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGlmICh2YWxzW2ldICE9IHByZXYpIGNhdGVnb3JpZXMucHVzaChcIlwiICsgdmFsc1tpXSk7XG4gICAgICAgICAgcHJldiA9IHZhbHNbaV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNjYWxlLmRvbWFpbihjYXRlZ29yaWVzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNjYWxlLnRpY2tzKCk7XG4gIH07XG5cbiAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBzY2FsZSh2W3ZhcmlhYmxlX10pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NhbGUodik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBheGlzO1xufVxuXG5pZiAoZ3JwaC5heGlzID09PSB1bmRlZmluZWQpIGdycGguYXhpcyA9IHt9O1xuZ3JwaC5heGlzLmNvbG91ciA9IGdycGhfYXhpc19jb2xvdXIoKTtcbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX2xpbmVhcihob3Jpem9udGFsKSB7XG5cbiAgdmFyIHNjYWxlXyA9IGdycGhfc2NhbGVfbGluZWFyKCk7XG4gIHZhciBob3Jpem9udGFsXyA9IGhvcml6b250YWw7XG4gIHZhciB2YXJpYWJsZV87XG4gIHZhciB3aWR0aF8sIGhlaWdodF87XG4gIHZhciBvcmlnaW5fO1xuICB2YXIgc2V0dGluZ3NfID0ge1xuICAgIFwidGlja19sZW5ndGhcIiA6IDUsXG4gICAgXCJ0aWNrX3BhZGRpbmdcIiA6IDIsXG4gICAgXCJwYWRkaW5nXCIgOiA0XG4gIH07XG5cbiAgdmFyIGR1bW15XyA9IGQzLnNlbGVjdChcImJvZHlcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmVhcmF4aXMgZHVtbXlcIilcbiAgICAuYXR0cihcIndpZHRoXCIsIDApLmF0dHIoXCJoZWlnaHRcIiwgMClcbiAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICB2YXIgbGFiZWxfc2l6ZV8gPSBncnBoX2xhYmVsX3NpemUoZHVtbXlfKTtcbiAgaWYgKGhvcml6b250YWxfKSBzY2FsZV8ubGFiZWxfc2l6ZShsYWJlbF9zaXplXy53aWR0aCk7XG4gIGVsc2Ugc2NhbGVfLmxhYmVsX3NpemUobGFiZWxfc2l6ZV8uaGVpZ2h0KTtcbiAgXG5cbiAgZnVuY3Rpb24gYXhpcyhnKSB7XG4gICAgdmFyIHRpY2tfZm9ybWF0ID0gbGFiZWxfc2l6ZV8uZm9ybWF0KCk7XG4gICAgdmFyIHcgPSBheGlzLndpZHRoKCk7XG4gICAgdmFyIHRpY2tzID0gYXhpcy50aWNrcygpO1xuICAgIGcuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAuYXR0cihcIndpZHRoXCIsIHcpLmF0dHIoXCJoZWlnaHRcIiwgYXhpcy5oZWlnaHQoKSk7XG4gICAgaWYgKGhvcml6b250YWwpIHtcbiAgICAgIGcuc2VsZWN0QWxsKFwiLnRpY2tcIikuZGF0YSh0aWNrcykuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKFwibGluZVwiKS5hdHRyKFwiY2xhc3NcIiwgXCJ0aWNrXCIpXG4gICAgICAgIC5hdHRyKFwieDFcIiwgc2NhbGVfKS5hdHRyKFwieDJcIiwgc2NhbGVfKVxuICAgICAgICAuYXR0cihcInkxXCIsIDApLmF0dHIoXCJ5MlwiLCBzZXR0aW5nc18udGlja19sZW5ndGgpO1xuICAgICAgZy5zZWxlY3RBbGwoXCIudGlja2xhYmVsXCIpLmRhdGEodGlja3MpLmVudGVyKClcbiAgICAgICAgLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwidGlja2xhYmVsXCIpXG4gICAgICAgIC5hdHRyKFwieFwiLCBzY2FsZV8pLmF0dHIoXCJ5XCIsIHNldHRpbmdzXy50aWNrX2xlbmd0aCArIHNldHRpbmdzXy50aWNrX3BhZGRpbmcpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHRpY2tfZm9ybWF0KGQpO30pXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgLmF0dHIoXCJkeVwiLCBcIjAuNzFlbVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5zZWxlY3RBbGwoXCIudGlja1wiKS5kYXRhKHRpY2tzKS5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tcIilcbiAgICAgICAgLmF0dHIoXCJ4MVwiLCB3LXNldHRpbmdzXy50aWNrX2xlbmd0aCkuYXR0cihcIngyXCIsIHcpXG4gICAgICAgIC5hdHRyKFwieTFcIiwgc2NhbGVfKS5hdHRyKFwieTJcIiwgc2NhbGVfKTtcbiAgICAgIGcuc2VsZWN0QWxsKFwiLnRpY2tsYWJlbFwiKS5kYXRhKHRpY2tzKS5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgICAuYXR0cihcInhcIiwgc2V0dGluZ3NfLnBhZGRpbmcpLmF0dHIoXCJ5XCIsIHNjYWxlXylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gdGlja19mb3JtYXQoZCk7fSlcbiAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcImJlZ2luXCIpXG4gICAgICAgIC5hdHRyKFwiZHlcIiwgXCIwLjM1ZW1cIik7XG4gICAgfVxuICB9XG5cbiAgYXhpcy53aWR0aCA9IGZ1bmN0aW9uKHdpZHRoKSB7XG4gICAgaWYgKGhvcml6b250YWxfKSB7XG4gICAgICAvLyBpZiBob3Jpem9udGFsIHRoZSB3aWR0aCBpcyB1c3VhbGx5IGdpdmVuOyB0aGlzIGRlZmluZXMgdGhlIHJhbmdlIG9mXG4gICAgICAvLyB0aGUgc2NhbGVcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB3aWR0aF87XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aWR0aF8gPSB3aWR0aDtcbiAgICAgICAgc2NhbGVfLnJhbmdlKFswLCB3aWR0aF9dKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGlmIHZlcnRpY2FsIHRoZSB3aWR0aCBpcyB1c3VhbGx5IGRlZmluZWQgYnkgdGhlIGdyYXBoOiB0aGUgc3BhY2UgaXRcbiAgICAgIC8vIG5lZWRzIHRvIGRyYXcgdGhlIHRpY2ttYXJrcyBhbmQgbGFiZWxzIGV0Yy4gXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvL3ZhciB0aWNrX2Zvcm1hdCA9IGxhYmVsX3NpemVfLmZvcm1hdCgpO1xuICAgICAgICB2YXIgdGlja3MgPSBzY2FsZV8udGlja3MoKTtcbiAgICAgICAgdmFyIHcgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgdmFyIGx3ID0gbGFiZWxfc2l6ZV8ud2lkdGgodGlja3NbaV0pO1xuICAgICAgICAgIGlmIChsdyA+IHcpIHcgPSBsdztcbiAgICAgICAgfVxuICAgICAgICB3aWR0aF8gPSB3ICsgc2V0dGluZ3NfLnRpY2tfbGVuZ3RoICsgc2V0dGluZ3NfLnRpY2tfcGFkZGluZyArIHNldHRpbmdzXy5wYWRkaW5nOyAgXG4gICAgICAgIHJldHVybiB3aWR0aF87XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aWR0aF8gPSB3aWR0aDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0KSB7XG4gICAgaWYgKGhvcml6b250YWxfKSB7XG4gICAgICAvLyBpZiBob3Jpem9udGFsIHRoZSB3aWR0aCBpcyB1c3VhbGx5IGRlZmluZWQgYnkgdGhlIGdyYXBoOiB0aGUgc3BhY2UgaXRcbiAgICAgIC8vIG5lZWRzIHRvIGRyYXcgdGhlIHRpY2ttYXJrcyBhbmQgbGFiZWxzIGV0Yy4gXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgdGlja19mb3JtYXQgPSBsYWJlbF9zaXplXy5mb3JtYXQoKTtcbiAgICAgICAgdmFyIHRpY2tzID0gc2NhbGVfLnRpY2tzKClcbiAgICAgICAgICAubWFwKHRpY2tfZm9ybWF0KTtcbiAgICAgICAgdmFyIGggPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgdmFyIGxoID0gbGFiZWxfc2l6ZV8uaGVpZ2h0KHRpY2tzW2ldKTtcbiAgICAgICAgICBpZiAobGggPiBoKSBoID0gbGg7XG4gICAgICAgIH1cbiAgICAgICAgaGVpZ2h0XyA9IGggKyBzZXR0aW5nc18udGlja19sZW5ndGggKyBzZXR0aW5nc18udGlja19wYWRkaW5nICsgc2V0dGluZ3NfLnBhZGRpbmc7IFxuICAgICAgICByZXR1cm4gaGVpZ2h0XztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiB2ZXJ0aWNhbCB0aGUgd2lkdGggaXMgdXN1YWxseSBnaXZlbjsgdGhpcyBkZWZpbmVzIHRoZSByYW5nZSBvZlxuICAgICAgLy8gdGhlIHNjYWxlXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gaGVpZ2h0XztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICAgIHNjYWxlXy5yYW5nZShbaGVpZ2h0XywgMF0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSAnbnVtYmVyJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGVfO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZV8gPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuZG9tYWluID0gZnVuY3Rpb24oZGF0YSwgc2NoZW1hKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzY2FsZV8uZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByYW5nZSA9IGQzLmV4dGVudChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiArZFt2YXJpYWJsZV9dO30pO1xuICAgICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGVfLCBzY2hlbWEpO1xuICAgICAgaWYgKHZzY2hlbWEub3JpZ2luKSBvcmlnaW5fID0gdnNjaGVtYS5vcmlnaW47XG4gICAgICBpZiAob3JpZ2luXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChyYW5nZVswXSA+IG9yaWdpbl8pIHJhbmdlWzBdID0gb3JpZ2luXztcbiAgICAgICAgaWYgKHJhbmdlWzFdIDwgb3JpZ2luXykgcmFuZ2VbMV0gPSBvcmlnaW5fO1xuICAgICAgfVxuICAgICAgc2NhbGVfLmRvbWFpbihyYW5nZSkubmljZSgpO1xuICAgICAgbGFiZWxfc2l6ZV8uZm9ybWF0KHZhcmlhYmxlX3ZhbHVlX2Zvcm1hdHRlcih2YXJpYWJsZV8sIHNjaGVtYSkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMub3JpZ2luID0gZnVuY3Rpb24ob3JpZ2luKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBvcmlnaW5fO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcmlnaW5fID0gb3JpZ2luO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2NhbGVfLnRpY2tzKCk7XG4gIH07XG5cbiAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT0gJ29iamVjdCcpIHsgXG4gICAgICByZXR1cm4gc2NhbGVfKHZbdmFyaWFibGVfXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZV8odik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBheGlzO1xufVxuXG5pZiAoZ3JwaC5heGlzID09PSB1bmRlZmluZWQpIGdycGguYXhpcyA9IHt9O1xuZ3JwaC5heGlzLmxpbmVhciA9IGdycGhfYXhpc19saW5lYXIoKTtcblxuIiwiXG5mdW5jdGlvbiBncnBoX2F4aXNfcGVyaW9kKCkge1xuXG4gIHZhciBzY2FsZV8gPSBncnBoX3NjYWxlX3BlcmlvZCgpO1xuICB2YXIgaGVpZ2h0XztcbiAgdmFyIHZhcmlhYmxlXztcbiAgdmFyIHNldHRpbmdzID0ge1xuICAgIFwidGlja19sZW5ndGhcIiA6IFsxNSwgMzAsIDQ1XSxcbiAgICBcInRpY2stdGhyZXNob2xkXCIgOiA3LFxuICAgIFwibGFiZWwteWVhci1zbWFsbFwiIDogMzAsXG4gICAgXCJsYWJlbC10aHJlc2hvbGRcIiA6IDE1XG4gIH07XG5cbiAgLy8gY2hlY2tzIGlmIHdlIG5lZWQvd2FudCB0byBkcmF3IHRpY2ttYXJrcyBhbmQgbGFiZWxzIGZvciBtb250aHMgYW5kXG4gIC8vIHF1YXJ0ZXJzLiBUaGlzIGRlcGVuZHMgb24gdGhlIGRlbnNpdHkuIFdoZW4gdGggZGVuc2l0eSBiZWNvbWVzIHRvb1xuICAvLyBsYXJnZSBmaXJzdCBubyBsYWJlbHMgYXJlIGRyYXduOyB3aGVuIGhpZ2hlciB0aGUgdGlja3NtYXJrcyBhcmUgYWxzb1xuICAvLyBub3QgZHJhd24uXG4gIGZ1bmN0aW9uIGRldGVybWluZV93aGF0X3RvX2RyYXcodGlja3MpIHtcbiAgICAvLyBkZXRlcm1pbmUgaWYgd2Ugd2FudCB0byBkcmF3IHRpY2tzIGFuZCBsYWJlbHMgZm9yIG1vbnRoc1xuICAgIHZhciBuID0gdGlja3MuZmlsdGVyKGZ1bmN0aW9uKHQpIHtyZXR1cm4gdC50eXBlID09IFwibW9udGhcIjt9KS5sZW5ndGg7XG4gICAgdmFyIGQgPSAoc2NhbGVfLnJhbmdlKClbMV0gLSBzY2FsZV8ucmFuZ2UoKVswXSkgLyBuO1xuICAgIHZhciBtb250aF90aWNrcyAgPSBzY2FsZV8uaGFzX21vbnRoKCkgJiYgZCA+IHNldHRpbmdzWyd0aWNrLXRocmVzaG9sZCddO1xuICAgIHZhciBtb250aF9sYWJlbHMgPSBzY2FsZV8uaGFzX21vbnRoKCkgJiYgZCA+IHNldHRpbmdzWydsYWJlbC10aHJlc2hvbGQnXTtcbiAgICAvLyBkZXRlcm1pbmUgaWYgd2Ugd2FudCB0byBkcmF3IHRpY2tzIGFuZCBsYWJlbHMgZm9yIHF1YXJ0ZXJzXG4gICAgbiA9IHRpY2tzLmZpbHRlcihmdW5jdGlvbih0KSB7cmV0dXJuIHQudHlwZSA9PSBcInF1YXJ0ZXJcIjt9KS5sZW5ndGg7XG4gICAgZCA9IChzY2FsZV8ucmFuZ2UoKVsxXSAtIHNjYWxlXy5yYW5nZSgpWzBdKSAvIG47XG4gICAgdmFyIHF1YXJ0ZXJfdGlja3MgID0gc2NhbGVfLmhhc19xdWFydGVyKCkgJiYgZCA+IHNldHRpbmdzWyd0aWNrLXRocmVzaG9sZCddO1xuICAgIHZhciBxdWFydGVyX2xhYmVscyA9IHNjYWxlXy5oYXNfcXVhcnRlcigpICYmIGQgPiBzZXR0aW5nc1snbGFiZWwtdGhyZXNob2xkJ107XG4gICAgLy8gZGV0ZXJtaW5lIGlmIHdlIHdhbnQgdG8gZHJhdyBhbGwgeWVhciBsYWJlbHMgb3Igb25seSB0aGUgYmVnaW4gYW5kIGVuZFxuICAgIC8vIGxhYmVsc1xuICAgIG4gPSB0aWNrcy5maWx0ZXIoZnVuY3Rpb24odCkge3JldHVybiB0LnR5cGUgPT0gXCJ5ZWFyXCI7fSkubGVuZ3RoO1xuICAgIGQgPSAoc2NhbGVfLnJhbmdlKClbMV0gLSBzY2FsZV8ucmFuZ2UoKVswXSkgLyBuO1xuICAgIHZhciB5ZWFyX2xhYmVscyA9IGQgPiBzZXR0aW5nc1snbGFiZWwtdGhyZXNob2xkJ107XG4gICAgdmFyIHllYXJfc21hbGwgPSBkIDwgc2V0dGluZ3NbJ2xhYmVsLXllYXItc21hbGwnXTtcbiAgICByZXR1cm4ge1xuICAgICAgbW9udGggOiB7dGlja3MgOiBtb250aF90aWNrcywgbGFiZWxzIDogbW9udGhfbGFiZWxzfSxcbiAgICAgIHF1YXJ0ZXIgOiB7dGlja3MgOiBxdWFydGVyX3RpY2tzLCBsYWJlbHMgOiBxdWFydGVyX2xhYmVsc30sXG4gICAgICB5ZWFyIDoge3RpY2tzOiB0cnVlLCBsYWJlbHMgOiB5ZWFyX2xhYmVscywgc21hbGw6IHllYXJfc21hbGx9XG4gICAgfTtcbiAgfVxuXG4gIHZhciBheGlzID0gZnVuY3Rpb24oZykge1xuICAgIHZhciB0aWNrcyA9IHNjYWxlXy50aWNrcygpO1xuXG4gICAgdmFyIHRvX2RyYXcgPSBkZXRlcm1pbmVfd2hhdF90b19kcmF3KHRpY2tzKTtcblxuICAgIHZhciB0aWNrX2xlbmd0aCA9IHt9O1xuICAgIHZhciB0aWNrID0gMDtcbiAgICBpZiAodG9fZHJhdy5tb250aC50aWNrcykgdGlja19sZW5ndGgubW9udGggPSBzZXR0aW5ncy50aWNrX2xlbmd0aFt0aWNrKytdO1xuICAgIGlmICh0b19kcmF3LnF1YXJ0ZXIudGlja3MpIHRpY2tfbGVuZ3RoLnF1YXJ0ZXIgPSBzZXR0aW5ncy50aWNrX2xlbmd0aFt0aWNrKytdO1xuICAgIHRpY2tfbGVuZ3RoLnllYXIgPSBzZXR0aW5ncy50aWNrX2xlbmd0aFt0aWNrKytdO1xuXG4gICAgLy8gZHJhdyB0aGUgdGljayBtYXJrc1xuICAgIC8vIHJlbW92ZSB0aWNrbWFya3MgdGhhdCBkbyBub3QgbmVlZCB0byBiZSBkcmF3blxuICAgIHRpY2tzID0gdGlja3MuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ3F1YXJ0ZXInICYmICF0b19kcmF3LnF1YXJ0ZXIudGlja3MpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ21vbnRoJyAmJiAhdG9fZHJhdy5tb250aC50aWNrcykgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBnLnNlbGVjdEFsbChcImxpbmUudGljay1lbmRcIikuZGF0YSh0aWNrcykuZW50ZXIoKS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGxhc3QgPSBkLmxhc3QgPyBcIiB0aWNrbGFzdFwiIDogXCJcIjtcbiAgICAgICAgcmV0dXJuIFwidGljayB0aWNrZW5kIHRpY2tcIiArIGQudHlwZSArIGxhc3Q7XG4gICAgICB9KVxuICAgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBzY2FsZV8oZC5wZXJpb2QuZW5kKTt9KVxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBzY2FsZV8oZC5wZXJpb2QuZW5kKTt9KVxuICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB0aWNrX2xlbmd0aFtkLnR5cGVdO30pO1xuICAgIGcuc2VsZWN0QWxsKFwibGluZS50aWNrLXN0YXJ0XCIpLmRhdGEodGlja3MpLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBsYXN0ID0gZC5sYXN0ID8gXCIgdGlja2xhc3RcIiA6IFwiXCI7XG4gICAgICAgIHJldHVybiBcInRpY2sgdGlja3N0YXJ0IHRpY2tcIiArIGQudHlwZSArIGxhc3Q7XG4gICAgICB9KVxuICAgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBzY2FsZV8oZC5wZXJpb2Quc3RhcnQpO30pXG4gICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHNjYWxlXyhkLnBlcmlvZC5zdGFydCk7fSlcbiAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gdGlja19sZW5ndGhbZC50eXBlXTt9KTtcblxuICAgIC8vIGRyYXcgdGhlIGxhYmVsc1xuICAgIC8vIHJlbW92ZSB0aWNrbWFya3MgdGhhdCBkbyBub3QgbmVlZCB0byBiZSBkcmF3blxuICAgIGNvbnNvbGUubG9nKHRvX2RyYXcpO1xuICAgIGNvbnNvbGUubG9nKHRpY2tzKTtcbiAgICB2YXIgZmlyc3RfeWVhciA9IHRydWU7XG4gICAgdGlja3MgPSB0aWNrcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQudHlwZSA9PSAncXVhcnRlcicgJiYgIXRvX2RyYXcucXVhcnRlci5sYWJlbHMpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ21vbnRoJyAmJiAhdG9fZHJhdy5tb250aC5sYWJlbHMpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ3llYXInICYmICF0b19kcmF3LnllYXIubGFiZWxzKSB7XG4gICAgICAgIHZhciBmaXJzdF9vcl9sYXN0ID0gZC5sYXN0IHx8IGZpcnN0X3llYXI7XG4gICAgICAgIGZpcnN0X3llYXIgPSBmYWxzZTtcbiAgICAgICAgaWYgKCFmaXJzdF9vcl9sYXN0KSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKFwidGlja3M9XCIsIHRpY2tzKTtcbiAgICBnLnNlbGVjdEFsbChcInRleHRcIikuZGF0YSh0aWNrcykuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidGlja2xhYmVsIHRpY2tsYWJlbFwiICsgZC50eXBlO30pXG4gICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gc2NhbGVfKGQuZGF0ZSk7fSlcbiAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB0aWNrX2xlbmd0aFtkLnR5cGVdO30pXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmIChkLnR5cGUgPT0gXCJtb250aFwiKSB7XG4gICAgICAgICAgcmV0dXJuIGQucGVyaW9kLnN0YXJ0LmZvcm1hdChcIk1NTVwiKS5jaGFyQXQoMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09IFwicXVhcnRlclwiKSB7XG4gICAgICAgICAgcmV0dXJuIFwiUVwiICsgZC5wZXJpb2Quc3RhcnQuZm9ybWF0KFwiUVwiKTtcbiAgICAgICAgfSBpZiAoZC50eXBlID09IFwieWVhclwiICYmIHRvX2RyYXcueWVhci5zbWFsbCkge1xuICAgICAgICAgIHJldHVybiAoZC5sYWJlbCArIFwiXCIpLnNsaWNlKC0yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICAgIH0pO1xuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0Xykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoaGVpZ2h0XyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciB0aWNrID0gMDtcbiAgICAgICAgaWYgKHNjYWxlXy5oYXNfbW9udGgpIHRpY2srKztcbiAgICAgICAgaWYgKHNjYWxlXy5oYXNfcXVhcnRlcikgdGljaysrO1xuICAgICAgICByZXR1cm4gc2V0dGluZ3MudGlja19sZW5ndGhbdGlja107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaGVpZ2h0XztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaGVpZ2h0XyA9IGhlaWdodDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIHIgPSBzY2FsZV8ucmFuZ2UoKTtcbiAgICAgIHJldHVybiByWzFdIC0gclswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NhbGVfLnJhbmdlKFswLCB3aWR0aF0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuYWNjZXB0ID0gZnVuY3Rpb24odmFyaWFibGUsIHNjaGVtYSkge1xuICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgIHJldHVybiB2c2NoZW1hLnR5cGUgPT0gJ2RhdGUnIHx8IHZzY2hlbWEudHlwZSA9PSAncGVyaW9kJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGVfO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZV8gPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuZG9tYWluID0gZnVuY3Rpb24oZGF0YSwgc2NoZW1hKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzY2FsZV8uZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkb21haW4gPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7IHJldHVybiBkW3ZhcmlhYmxlX107fSk7XG4gICAgICBzY2FsZV8uZG9tYWluKGRvbWFpbik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cblxuICBheGlzLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpY2tzID0gc2NhbGVfLnRpY2tzKCk7XG4gICAgcmV0dXJuIHRpY2tzLmZpbHRlcihmdW5jdGlvbihkKSB7IHJldHVybiBkLnR5cGUgPT0gXCJ5ZWFyXCI7fSk7XG4gIH07XG5cbiAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2Lmhhc093blByb3BlcnR5KFwiZGF0ZVwiKSAmJiB2Lmhhc093blByb3BlcnR5KFwicGVyaW9kXCIpKSB7XG4gICAgICAgIHJldHVybiBzY2FsZV8odik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2NhbGVfKHZbdmFyaWFibGVfXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZV8odik7XG4gICAgfVxuICB9O1xuXG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmlmIChncnBoLmF4aXMgPT09IHVuZGVmaW5lZCkgZ3JwaC5heGlzID0ge307XG5ncnBoLmF4aXMucGVyaW9kID0gZ3JwaF9heGlzX3BlcmlvZCgpO1xuIiwiXG5mdW5jdGlvbiBncnBoX2F4aXNfcmVnaW9uKCkge1xuXG4gIHZhciB2YXJpYWJsZV87XG4gIHZhciB3aWR0aF8sIGhlaWdodF87XG4gIHZhciBtYXBfbG9hZGVkXztcbiAgdmFyIG1hcF87XG4gIHZhciBpbmRleF8gPSB7fTtcblxuICBmdW5jdGlvbiBheGlzKGcpIHtcbiAgfVxuXG4gIGF4aXMud2lkdGggPSBmdW5jdGlvbih3aWR0aCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gd2lkdGhfO1xuICAgIH0gZWxzZSB7XG4gICAgICB1cGRhdGVfcHJvamVjdGlvbl8gPSB1cGRhdGVfcHJvamVjdGlvbl8gfHwgd2lkdGhfICE9IHdpZHRoO1xuICAgICAgd2lkdGhfID0gd2lkdGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoZWlnaHQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodF87XG4gICAgfSBlbHNlIHtcbiAgICAgIHVwZGF0ZV9wcm9qZWN0aW9uXyA9IHVwZGF0ZV9wcm9qZWN0aW9uXyB8fCBoZWlnaHRfICE9IGhlaWdodDtcbiAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSAnc3RyaW5nJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGVfO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZV8gPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIC8vIFZhcmlhYmxlIGFuZCBmdW5jdGlvbiB0aGF0IGtlZXBzIHRyYWNrIG9mIHdoZXRoZXIgb3Igbm90IHRoZSBtYXAgaGFzIFxuICAvLyBmaW5pc2hlZCBsb2FkaW5nLiBUaGUgbWV0aG9kIGRvbWFpbigpIGxvYWRzIHRoZSBtYXAuIEhvd2V2ZXIsIHRoaXMgaGFwcGVuc1xuICAvLyBhc3luY2hyb25vdXNseS4gVGhlcmVmb3JlLCBpdCBpcyBwb3NzaWJsZSAoYW5kIG9mdGVuIGhhcHBlbnMpIHRoYXQgdGhlIG1hcFxuICAvLyBoYXMgbm90IHlldCBsb2FkZWQgd2hlbiBzY2FsZSgpIGFuZCB0cmFuc2Zvcm0oKSBhcmUgY2FsbGVkLiBUaGUgY29kZSBcbiAgLy8gY2FsbGluZyB0aGVzZSBtZXRob2RzIHRoZXJlZm9yZSBuZWVkcyB0byB3YWl0IHVudGlsIHRoZSBtYXAgaGFzIGxvYWRlZC4gXG4gIHZhciBtYXBfbG9hZGluZ18gPSBmYWxzZTsgXG4gIGF4aXMubWFwX2xvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhbWFwX2xvYWRpbmdfO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGxvYWRfbWFwKGRhdGEsIHNjaGVtYSwgY2FsbGJhY2spIHtcbiAgICBpZiAodmFyaWFibGVfID09PSB1bmRlZmluZWQpIHJldHVybiA7IC8vIFRPRE9cbiAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgaWYgKHZzY2hlbWEubWFwID09PSB1bmRlZmluZWQpIHJldHVybiA7IC8vIFRPRE9cbiAgICBpZiAodnNjaGVtYS5tYXAgPT0gbWFwX2xvYWRlZF8pIHJldHVybjsgXG4gICAgbWFwX2xvYWRpbmdfID0gdHJ1ZTtcbiAgICAvLyBUT0RPIGhhbmRsZSBlcnJvcnMgaW4gZDMuanNvblxuICAgIGQzLmpzb24odnNjaGVtYS5tYXAsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIG1hcF9sb2FkZWRfID0gdnNjaGVtYS5tYXA7XG4gICAgICBjYWxsYmFjayhqc29uKTtcbiAgICAgIG1hcF9sb2FkaW5nXyA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy9yZXR1cm4gc2NhbGUuZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvYWRfbWFwKGRhdGEsIHNjaGVtYSwgZnVuY3Rpb24obWFwKSB7XG4gICAgICAgIG1hcF8gPSBtYXA7XG4gICAgICAgIHVwZGF0ZV9wcm9qZWN0aW9uXyA9IHRydWU7XG4gICAgICAgIC8vIGJ1aWxkIGluZGV4IG1hcHBpbmcgcmVnaW9uIG5hbWUgb24gZmVhdHVyZXMgXG4gICAgICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlXywgc2NoZW1hKTtcbiAgICAgICAgdmFyIHJlZ2lvbmlkID0gdnNjaGVtYS5yZWdpb25pZCB8fCBcImlkXCI7XG4gICAgICAgIGZvciAodmFyIGZlYXR1cmUgaW4gbWFwXy5mZWF0dXJlcykge1xuICAgICAgICAgIHZhciBuYW1lID0gbWFwXy5mZWF0dXJlc1tmZWF0dXJlXS5wcm9wZXJ0aWVzW3JlZ2lvbmlkXTtcbiAgICAgICAgICBpbmRleF9bbmFtZV0gPSBmZWF0dXJlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0JykgeyBcbiAgICAgIHJldHVybiBheGlzLnNjYWxlKHZbdmFyaWFibGVfXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF4aXMudXBkYXRlX3Byb2plY3Rpb24oKTtcbiAgICAgIHJldHVybiBwYXRoXyhtYXBfLmZlYXR1cmVzW2luZGV4X1t2XV0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBUaGUgcHJvamVjdGlvbi4gQ2FsY3VsYXRpbmcgdGhlIHNjYWxlIGFuZCB0cmFuc2xhdGlvbiBvZiB0aGUgcHJvamVjdGlvbiBcbiAgLy8gdGFrZXMgdGltZS4gVGhlcmVmb3JlLCB3ZSBvbmx5IHdhbnQgdG8gZG8gdGhhdCB3aGVuIG5lY2Vzc2FyeS4gXG4gIC8vIHVwZGF0ZV9wcm9qZWN0aW9uXyBrZWVwcyB0cmFjayBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgcHJvamVjdGlvbiBuZWVkcyBcbiAgLy8gcmVjYWxjdWxhdGlvblxuICB2YXIgdXBkYXRlX3Byb2plY3Rpb25fID0gdHJ1ZTtcbiAgLy8gdGhlIHByb2plY3Rpb25cbiAgdmFyIHByb2plY3Rpb25fID0gZDMuZ2VvLnRyYW5zdmVyc2VNZXJjYXRvcigpXG4gICAgLnJvdGF0ZShbLTUuMzg3MjA2MjEsIC01Mi4xNTUxNzQ0MF0pLnNjYWxlKDEpLnRyYW5zbGF0ZShbMCwwXSk7XG4gIHZhciBwYXRoXyA9IGQzLmdlby5wYXRoKCkucHJvamVjdGlvbihwcm9qZWN0aW9uXyk7XG4gIC8vIGZ1bmN0aW9uIHRoYXQgcmVjYWxjdWxhdGVzIHRoZSBzY2FsZSBhbmQgdHJhbnNsYXRpb24gb2YgdGhlIHByb2plY3Rpb25cbiAgYXhpcy51cGRhdGVfcHJvamVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh1cGRhdGVfcHJvamVjdGlvbl8gJiYgbWFwXykge1xuICAgICAgcHJvamVjdGlvbl8uc2NhbGUoMSkudHJhbnNsYXRlKFswLDBdKTtcbiAgICAgIHBhdGhfID0gZDMuZ2VvLnBhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb25fKTtcbiAgICAgIHZhciBib3VuZHMgPSBwYXRoXy5ib3VuZHMobWFwXyk7XG4gICAgICB2YXIgc2NhbGUgID0gMC45NSAvIE1hdGgubWF4KChib3VuZHNbMV1bMF0gLSBib3VuZHNbMF1bMF0pIC8gd2lkdGhfLCBcbiAgICAgICAgICAgICAgICAgIChib3VuZHNbMV1bMV0gLSBib3VuZHNbMF1bMV0pIC8gaGVpZ2h0Xyk7XG4gICAgICB2YXIgdHJhbnNsID0gWyh3aWR0aF8gLSBzY2FsZSAqIChib3VuZHNbMV1bMF0gKyBib3VuZHNbMF1bMF0pKSAvIDIsIFxuICAgICAgICAgICAgICAgICAgKGhlaWdodF8gLSBzY2FsZSAqIChib3VuZHNbMV1bMV0gKyBib3VuZHNbMF1bMV0pKSAvIDJdO1xuICAgICAgcHJvamVjdGlvbl8uc2NhbGUoc2NhbGUpLnRyYW5zbGF0ZSh0cmFuc2wpO1xuICAgICAgdXBkYXRlX3Byb2plY3Rpb25fID0gZmFsc2U7XG4gICAgfVxuICB9O1xuXG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbi8vIEEgZnVuY3Rpb24gZXhwZWN0aW5nIHR3byBmdW5jdGlvbnMuIFRoZSBzZWNvbmQgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIFxuLy8gZmlyc3QgZnVuY3Rpb24gcmV0dXJucyB0cnVlLiBXaGVuIHRoZSBmaXJzdCBmdW5jdGlvbiBkb2VzIG5vdCByZXR1cm4gdHJ1ZVxuLy8gd2Ugd2FpdCBmb3IgMTAwbXMgYW5kIHRyeSBhZ2Fpbi4gXG52YXIgd2FpdF9mb3IgPSBmdW5jdGlvbihtLCBmKSB7XG4gIGlmIChtKCkpIHtcbiAgICBmKCk7XG4gIH0gZWxzZSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgd2FpdF9mb3IobSwgZik7fSwgMTAwKTtcbiAgfVxufTtcblxuaWYgKGdycGguYXhpcyA9PT0gdW5kZWZpbmVkKSBncnBoLmF4aXMgPSB7fTtcbmdycGguYXhpcy5saW5lYXIgPSBncnBoX2F4aXNfbGluZWFyKCk7XG5cbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX3NpemUoKSB7XG5cbiAgdmFyIHZhcmlhYmxlXztcbiAgdmFyIHdpZHRoLCBoZWlnaHQ7XG4gIHZhciBzY2FsZSA9IGdycGhfc2NhbGVfc2l6ZSgpO1xuXG4gIGZ1bmN0aW9uIGF4aXMoZykge1xuICB9XG5cbiAgYXhpcy53aWR0aCA9IGZ1bmN0aW9uKHcpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHdpZHRoO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aWR0aCA9IHc7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodCA9IGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSAnbnVtYmVyJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhcmlhYmxlID0gdjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmRvbWFpbiA9IGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2NhbGUuZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2YXJpYWJsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcztcbiAgICAgIHNjYWxlLmRvbWFpbihkMy5leHRlbnQoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZFt2YXJpYWJsZV07fSkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2NhbGUudGlja3MoKTtcbiAgfTtcblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0JykgeyBcbiAgICAgIHJldHVybiBheGlzLnNjYWxlKHZbdmFyaWFibGVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNjYWxlKHYpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gYXhpcztcbn1cblxuaWYgKGdycGguYXhpcyA9PT0gdW5kZWZpbmVkKSBncnBoLmF4aXMgPSB7fTtcbmdycGguYXhpcy5zaXplID0gZ3JwaF9heGlzX3NpemUoKTtcblxuIiwiXG5mdW5jdGlvbiBncnBoX2F4aXNfc3BsaXQoKSB7XG5cbiAgdmFyIHZhcmlhYmxlXztcbiAgdmFyIHdpZHRoXywgaGVpZ2h0XztcbiAgdmFyIGRvbWFpbl87XG4gIHZhciB0aWNrc187XG4gIHZhciBzZXR0aW5nc18gPSB7XG4gIH07XG5cbiAgZnVuY3Rpb24gYXhpcyhnKSB7XG4gIH1cblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHdpZHRoXztcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGhfID0gd2lkdGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoZWlnaHQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodF87XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIgfHwgdnNjaGVtYS50eXBlID09IFwicGVyaW9kXCI7XG4gIH07XG5cbiAgYXhpcy52YXJpYWJsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhcmlhYmxlXztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGVfID0gdjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcbiBcbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRvbWFpbl87XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2YXJpYWJsZV8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IFtdO1xuICAgICAgaWYgKHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIpIHtcbiAgICAgICAgY2F0ZWdvcmllcyA9IHZzY2hlbWEuY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lOyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWxzID0gZGF0YS5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZFt2YXJpYWJsZV9dO30pLnNvcnQoKTtcbiAgICAgICAgdmFyIHByZXY7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFscy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGlmICh2YWxzW2ldICE9IHByZXYpIGNhdGVnb3JpZXMucHVzaChcIlwiICsgdmFsc1tpXSk7XG4gICAgICAgICAgcHJldiA9IHZhbHNbaV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRvbWFpbl8gPSBjYXRlZ29yaWVzO1xuICAgICAgdmFyIGZvcm1hdCA9IHZhcmlhYmxlX3ZhbHVlX2Zvcm1hdHRlcih2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgICB0aWNrc18gPSBkb21haW5fLm1hcChmb3JtYXQpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGlja3NfO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIGRvbWFpbl8uaW5kZXhPZih2KTtcbiAgfTtcblxuICByZXR1cm4gYXhpcztcbn1cbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX3N3aXRjaChheGVzKSB7XG5cbiAgdmFyIHR5cGUgPSAwO1xuXG4gIHZhciBheGlzID0gZnVuY3Rpb24oZykge1xuICAgIHJldHVybiBheGVzW3R5cGVdKGcpO1xuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0Xykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS5oZWlnaHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPGF4ZXMubGVuZ3RoOyArK2kpIGF4ZXNbaV0uaGVpZ2h0KGhlaWdodF8pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMud2lkdGggPSBmdW5jdGlvbih3aWR0aCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS53aWR0aCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8YXhlcy5sZW5ndGg7ICsraSkgYXhlc1tpXS53aWR0aCh3aWR0aCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgZm9yICh2YXIgaT0wOyBpPGF4ZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChheGVzW2ldLmFjY2VwdCh2YXJpYWJsZSwgc2NoZW1hKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS52YXJpYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8YXhlcy5sZW5ndGg7ICsraSkgYXhlc1tpXS52YXJpYWJsZSh2KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmRvbWFpbiA9IGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS52YXJpYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGlzLnZhcmlhYmxlKCk7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8YXhlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAoYXhlc1tpXS5hY2NlcHQodmFyaWFibGUsIHNjaGVtYSkpIHtcbiAgICAgICAgICB0eXBlID0gaTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXhlc1t0eXBlXS5kb21haW4oZGF0YSwgc2NoZW1hKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXhlc1t0eXBlXS50aWNrcygpO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIGF4ZXNbdHlwZV0uc2NhbGUodik7XG4gIH07XG5cbiAgcmV0dXJuIGF4aXM7XG59XG4iLCJcbmZ1bmN0aW9uIHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZSwgc2NoZW1hKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2NoZW1hLmZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzY2hlbWEuZmllbGRzW2ldLm5hbWUgPT0gdmFyaWFibGUpIFxuICAgICAgcmV0dXJuIHNjaGVtYS5maWVsZHNbaV07XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gdmFyaWFibGVfdmFsdWVfZm9ybWF0dGVyKHZhcmlhYmxlLCBzY2hlbWEpe1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNjaGVtYS5maWVsZHMubGVuZ3RoOyBpKyspe1xuICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgICBpZiAoZmllbGQubmFtZSA9PSB2YXJpYWJsZSl7XG4gICAgICBzd2l0Y2goZmllbGQudHlwZSl7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjp7XG4gICAgICAgICAgcmV0dXJuIG51bWJlcl9mb3JtYXR0ZXIoZmllbGQpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJjYXRlZ29yaWNhbFwiOntcbiAgICAgICAgICByZXR1cm4gY2F0ZWdvcmljYWxfZm9ybWF0dGVyKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFwic3RyaW5nXCI6e1xuICAgICAgICAgIHJldHVybiBjYXRlZ29yaWNhbF9mb3JtYXR0ZXIoZmllbGQpO1xuICAgICAgICB9ICAgICAgICBcbiAgICAgICAgZGVmYXVsdDp7XG4gICAgICAgICAgcmV0dXJuIGRlZmF1bHRfZm9ybWF0dGVyKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0X2Zvcm1hdHRlcigpO1xufVxuLy8gY3JlYXRlcyBhIGZvcm1hdHRlciBmb3IgcHJldHR5IHByaW50aW5nIHZhbHVlcyBmb3IgYSBzcGVjaWZpYyBmaWVsZCBcbmZ1bmN0aW9uIHZhbHVlX2Zvcm1hdHRlcihzY2hlbWEpe1xuICB2YXIgZm9ybWF0dGVycyA9IHt9O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNjaGVtYS5maWVsZHMubGVuZ3RoOyBpKyspe1xuICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgc3dpdGNoKGZpZWxkLnR5cGUpe1xuICAgICAgY2FzZSBcIm51bWJlclwiOntcbiAgICAgICAgZm9ybWF0dGVyc1tmaWVsZC5uYW1lXSA9IG51bWJlcl9mb3JtYXR0ZXIoZmllbGQpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJjYXRlZ29yaWNhbFwiOntcbiAgICAgICAgZm9ybWF0dGVyc1tmaWVsZC5uYW1lXSA9IGNhdGVnb3JpY2FsX2Zvcm1hdHRlcihmaWVsZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBcInN0cmluZ1wiOntcbiAgICAgICAgZm9ybWF0dGVyc1tmaWVsZC5uYW1lXSA9IGNhdGVnb3JpY2FsX2Zvcm1hdHRlcihmaWVsZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDp7XG4gICAgICAgIGZvcm1hdHRlcnNbZmllbGQubmFtZV0gPSBkZWZhdWx0X2Zvcm1hdHRlcihmaWVsZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdHVtLCBuYW1lKXtcbiAgICByZXR1cm4gZm9ybWF0dGVyc1tuYW1lXShkYXR1bVtuYW1lXSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRfZm9ybWF0dGVyKGZpZWxkKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKXtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNhdGVnb3JpY2FsX2Zvcm1hdHRlcihmaWVsZCl7XG4gIHZhciBjYXRfdGl0bGVzID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGQuY2F0ZWdvcmllcy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIGNhdCA9IGZpZWxkLmNhdGVnb3JpZXNbaV07XG4gICAgY2F0X3RpdGxlc1tjYXQubmFtZV0gPSBjYXQudGl0bGUgfHwgY2F0Lm5hbWU7XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKXtcbiAgICByZXR1cm4gY2F0X3RpdGxlc1t2YWx1ZV0gfHwgXCIoXCIgKyB2YWx1ZSArIFwiKVwiO1xuICB9O1xufVxuXG5GQUNUT1IgPSAveCA/KFxcZCA/XFxkKikoLiopLztcblxuZnVuY3Rpb24gbnVtYmVyX2Zvcm1hdHRlcihmaWVsZCl7XG4gIC8vVE9ETyB1c2Ugcm91bmRpbmc/XG4gIHZhciB1bml0ID0gZmllbGQudW5pdCB8fCBcIlwiO1xuICB2YXIgZmFjdG9yID0gMTtcbiAgXG4gIGlmIChGQUNUT1IudGVzdCh1bml0KSl7XG4gICAgdmFyIG0gPSBGQUNUT1IuZXhlYyh1bml0KTtcbiAgICBmYWN0b3IgPSBwYXJzZUludChtWzFdLnJlcGxhY2UoXCIgXCIsIFwiXCIpKTtcbiAgICB1bml0ID0gbVsyXS50cmltTGVmdCgpO1xuICB9XG5cbiAgaWYgKHVuaXQgPT0gXCIlXCIpe1xuICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICByZXR1cm4gKGZhY3Rvcip2YWx1ZSkudG9Mb2NhbGVTdHJpbmcoKSArIFwiJVwiOyAgICBcbiAgICB9O1xuICB9XG5cbiAgdmFyIGluX2V1cm8gPSAvXFxzP1xcYmV1cm8kLzsgXG4gIGlmIChpbl9ldXJvLnRlc3QodW5pdCkpe1xuICAgIHVuaXQgPSB1bml0LnJlcGxhY2UoaW5fZXVybywgXCJcIik7XG4gICAgaWYgKHVuaXQubGVuZ3RoKSB7XG4gICAgICB1bml0ID0gXCIgXCIgKyB1bml0O1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBcIuKCrCBcIiArIChmYWN0b3IqdmFsdWUpLnRvTG9jYWxlU3RyaW5nKCkgKyB1bml0O1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpe1xuICAgIHJldHVybiAoZmFjdG9yKnZhbHVlKS50b0xvY2FsZVN0cmluZygpICsgXCIgXCIgKyB1bml0O1xuICB9O1xufVxuIiwiXG5cbmZ1bmN0aW9uIGRhdGVfcGVyaW9kKHN0cikge1xuXG4gIGZ1bmN0aW9uIGlzX3llYXIocGVyaW9kKSB7XG4gICAgLy8gc3RhcnRpbmcgbW9udGggc2hvdWxkIGJlIDBcbiAgICBpZiAocGVyaW9kLnN0YXJ0Lm1vbnRoKCkgIT09IDApIHJldHVybiBmYWxzZTtcbiAgICAvLyBzdGFydGluZyBkYXkgb2YgbW9udGggc2hvdWxkIGJlIDFcbiAgICBpZiAocGVyaW9kLnN0YXJ0LmRhdGUoKSAhPSAxKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gbGVuZ3RoIHNob3VsZCBiZSAxIHllYXJcbiAgICByZXR1cm4gcGVyaW9kLmxlbmd0aChcInllYXJzXCIpID09IDE7XG4gIH1cbiAgZnVuY3Rpb24gaXNfcXVhcnRlcihwZXJpb2QpIHtcbiAgICAvLyBzdGFydGluZyBtb250aCBzaG91bGQgYmUgMCwgMywgNiwgb3IgOVxuICAgIGlmICgocGVyaW9kLnN0YXJ0Lm1vbnRoKCkgJSAzKSAhPT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIHN0YXJ0aW5nIGRheSBvZiBtb250aCBzaG91bGQgYmUgMVxuICAgIGlmIChwZXJpb2Quc3RhcnQuZGF0ZSgpICE9IDEpIHJldHVybiBmYWxzZTtcbiAgICAvLyBsZW5ndGggc2hvdWxkIGJlIDMgbW9udGhzXG4gICAgcmV0dXJuIHBlcmlvZC5sZW5ndGgoXCJtb250aHNcIikgPT0gMztcbiAgfVxuICBmdW5jdGlvbiBpc19tb250aChwZXJpb2QpIHtcbiAgICAvLyBzdGFydGluZyBkYXkgb2YgbW9udGggc2hvdWxkIGJlIDFcbiAgICBpZiAocGVyaW9kLnN0YXJ0LmRhdGUoKSAhPSAxKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gbGVuZ3RoIHNob3VsZCBiZSAxIG1vbnRoc1xuICAgIHJldHVybiBwZXJpb2QubGVuZ3RoKFwibW9udGhzXCIpID09IDE7XG4gIH1cblxuICB2YXIgYmFzaWNfeWVhcl9yZWdleHAgPSAvXihcXGR7NH0pJC87XG4gIHZhciBiYXNpY19tb250aF9yZWdleHAgPSAvXihcXGR7NH0pW01tLV17MX0oXFxkezEsMn0pJC87XG4gIHZhciBiYXNpY19xdWFydGVyX3JlZ2V4cCA9IC9eKFxcZHs0fSlbUXFdezF9KFxcZHsxLDJ9KSQvO1xuXG4gIHZhciB0MCwgZHQsIHAsIHQsIHllYXI7XG4gIGlmIChiYXNpY195ZWFyX3JlZ2V4cC50ZXN0KHN0cikpIHtcbiAgICBzdHIgPSBiYXNpY195ZWFyX3JlZ2V4cC5leGVjKHN0cik7XG4gICAgeWVhciA9ICtzdHJbMV07XG4gICAgdDAgPSBtb21lbnQudXRjKFsrc3RyWzFdXSk7XG4gICAgZHQgPSBtb21lbnQuZHVyYXRpb24oMSwgXCJ5ZWFyXCIpO1xuICAgIHAgID0gZHQuYWZ0ZXJNb21lbnQodDApO1xuICAgIHQgID0gdDAuYWRkKG1vbWVudC5kdXJhdGlvbihwLmxlbmd0aCgpLzIpKTtcbiAgICByZXR1cm4ge3R5cGU6IFwieWVhclwiLCBkYXRlOiB0LCBwZXJpb2Q6IHB9O1xuICB9IGVsc2UgaWYgKGJhc2ljX21vbnRoX3JlZ2V4cC50ZXN0KHN0cikpIHtcbiAgICBzdHIgPSBiYXNpY19tb250aF9yZWdleHAuZXhlYyhzdHIpO1xuICAgIHQwID0gbW9tZW50LnV0YyhbK3N0clsxXSwgK3N0clsyXS0xXSk7XG4gICAgZHQgPSBtb21lbnQuZHVyYXRpb24oMSwgXCJtb250aFwiKTtcbiAgICBwICA9IGR0LmFmdGVyTW9tZW50KHQwKTtcbiAgICB0ICA9IHQwLmFkZChtb21lbnQuZHVyYXRpb24ocC5sZW5ndGgoKS8yKSk7XG4gICAgcmV0dXJuIHt0eXBlOiBcIm1vbnRoXCIsIGRhdGU6IHQsIHBlcmlvZDogcH07XG4gIH0gZWxzZSBpZiAoYmFzaWNfcXVhcnRlcl9yZWdleHAudGVzdChzdHIpKSB7XG4gICAgc3RyID0gYmFzaWNfcXVhcnRlcl9yZWdleHAuZXhlYyhzdHIpO1xuICAgIHllYXIgICAgPSArc3RyWzFdO1xuICAgIHZhciBxdWFydGVyID0gK3N0clsyXTtcbiAgICB0MCA9IG1vbWVudC51dGMoWytzdHJbMV0sICgrc3RyWzJdLTEpKjNdKTtcbiAgICBkdCA9IG1vbWVudC5kdXJhdGlvbigzLCBcIm1vbnRoXCIpO1xuICAgIHAgID0gZHQuYWZ0ZXJNb21lbnQodDApO1xuICAgIHQgID0gdDAuYWRkKG1vbWVudC5kdXJhdGlvbihwLmxlbmd0aCgpLzIpKTtcbiAgICByZXR1cm4ge3R5cGU6IFwicXVhcnRlclwiLCBkYXRlOiB0LCBwZXJpb2Q6IHB9O1xuICB9IGVsc2UgaWYgKHR5cGVvZihzdHIpID09IFwic3RyaW5nXCIpIHtcbiAgICBzdHIgPSBzdHIuc3BsaXQoXCIvXCIpO1xuICAgIHQwICAgPSBtb21lbnQudXRjKHN0clswXSwgbW9tZW50LklTT184NjAxKTtcbiAgICBpZiAoc3RyLmxlbmd0aCA9PSAxKSB7XG4gICAgICBkdCA9IG1vbWVudC5kdXJhdGlvbigwKTtcbiAgICAgIHJldHVybiB7dHlwZTogXCJkYXRlXCIsIGRhdGU6IHQwLCBwZXJpb2Q6IGR0LmFmdGVyTW9tZW50KHQwKX07XG4gICAgfSBlbHNlIHtcbiAgICAgIGR0ID0gbW9tZW50LmR1cmF0aW9uKHN0clsxXSk7XG4gICAgICBwICA9IGR0LmFmdGVyTW9tZW50KHQwKTtcbiAgICAgIHQgID0gdDAuYWRkKG1vbWVudC5kdXJhdGlvbihwLmxlbmd0aCgpLzIpKTtcbiAgICAgIHZhciB0eXBlID0gXCJwZXJpb2RcIjtcbiAgICAgIGlmIChpc195ZWFyKHApKSB7XG4gICAgICAgIHR5cGUgPSBcInllYXJcIjtcbiAgICAgIH0gZWxzZSBpZiAoaXNfcXVhcnRlcihwKSkge1xuICAgICAgICB0eXBlID0gXCJxdWFydGVyXCI7XG4gICAgICB9IGVsc2UgaWYgKGlzX21vbnRoKHApKSB7XG4gICAgICAgIHR5cGUgPSBcIm1vbnRoXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4ge3R5cGU6IHR5cGUsIGRhdGU6IHQsIHBlcmlvZDogcH07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHQwICAgPSBtb21lbnQudXRjKHN0cik7XG4gICAgZHQgPSBtb21lbnQuZHVyYXRpb24oMCk7XG4gICAgcmV0dXJuIHt0eXBlOiBcImRhdGVcIiwgZGF0ZTogdDAsIHBlcmlvZDogZHQuYWZ0ZXJNb21lbnQodDApfTtcbiAgfVxufVxuIiwiXG5mdW5jdGlvbiBncnBoX2dlbmVyaWNfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIHR5cGUsIGdyYXBoX3BhbmVsKSB7XG5cbiAgdmFyIGR1bW15XyA9IGQzLnNlbGVjdChcImJvZHlcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLCBcImR1bW15IGdyYXBoIGdyYXBoLVwiICsgdHlwZSlcbiAgICAuYXR0cihcIndpZHRoXCIsIDApLmF0dHIoXCJoZWlnaHRcIiwgMClcbiAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICB2YXIgbGFiZWxfc2l6ZV8gPSBncnBoX2xhYmVsX3NpemUoZHVtbXlfKTtcblxuXG4gIHZhciBncmFwaCA9IGdycGhfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIGZ1bmN0aW9uKGcpIHtcbiAgICBmdW5jdGlvbiBuZXN0X2NvbHVtbihkKSB7XG4gICAgICByZXR1cm4gYXhlcy5jb2x1bW4udmFyaWFibGUoKSA/IGRbYXhlcy5jb2x1bW4udmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICBmdW5jdGlvbiBuZXN0X3JvdyhkKSB7XG4gICAgICByZXR1cm4gYXhlcy5yb3cudmFyaWFibGUoKSA/IGRbYXhlcy5yb3cudmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICAvLyBzZXR1cCBheGVzXG4gICAgZm9yICh2YXIgYXhpcyBpbiBheGVzKSBheGVzW2F4aXNdLmRvbWFpbihncmFwaC5kYXRhKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICAvLyBkZXRlcm1pbmUgbnVtYmVyIG9mIHJvd3MgYW5kIGNvbHVtbnNcbiAgICB2YXIgbmNvbCA9IGF4ZXMuY29sdW1uLnZhcmlhYmxlKCkgPyBheGVzLmNvbHVtbi50aWNrcygpLmxlbmd0aCA6IDE7XG4gICAgdmFyIG5yb3cgPSBheGVzLnJvdy52YXJpYWJsZSgpID8gYXhlcy5yb3cudGlja3MoKS5sZW5ndGggOiAxO1xuICAgIC8vIGdldCBsYWJlbHMgYW5kIGRldGVybWluZSB0aGVpciBoZWlnaHRcbiAgICB2YXIgdnNjaGVtYXggPSB2YXJpYWJsZV9zY2hlbWEoYXhlcy54LnZhcmlhYmxlKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICB2YXIgeGxhYmVsID0gdnNjaGVtYXgudGl0bGU7XG4gICAgdmFyIGxhYmVsX2hlaWdodCA9IGxhYmVsX3NpemVfLmhlaWdodCh4bGFiZWwpICsgc2V0dGluZ3MoJ2xhYmVsX3BhZGRpbmcnKTtcbiAgICB2YXIgdnNjaGVtYXkgPSB2YXJpYWJsZV9zY2hlbWEoYXhlcy55LnZhcmlhYmxlKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICB2YXIgeWxhYmVsID0gdnNjaGVtYXkudGl0bGU7XG4gICAgLy8gc2V0IHRoZSB3aWR0aCwgaGVpZ2h0IGVuZCBkb21haW4gb2YgdGhlIHgtIGFuZCB5LWF4ZXMuIFdlIG5lZWQgc29tZSBcbiAgICAvLyBpdGVyYXRpb25zIGZvciB0aGlzLCBhcyB0aGUgaGVpZ2h0IG9mIHRoZSB5LWF4aXMgZGVwZW5kcyBvZiB0aGUgaGVpZ2h0XG4gICAgLy8gb2YgdGhlIHgtYXhpcywgd2hpY2ggZGVwZW5kcyBvbiB0aGUgbGFiZWxzIG9mIHRoZSB4LWF4aXMsIHdoaWNoIGRlcGVuZHNcbiAgICAvLyBvbiB0aGUgd2lkdGggb2YgdGhlIHgtYXhpcywgZXRjLiBcbiAgICB2YXIgcm93bGFiZWxfd2lkdGggPSBheGVzLnJvdy52YXJpYWJsZSgpID8gMypsYWJlbF9oZWlnaHQgOiAwO1xuICAgIHZhciBjb2x1bW5sYWJlbF9oZWlnaHQgPSBheGVzLmNvbHVtbi52YXJpYWJsZSgpID8gMypsYWJlbF9oZWlnaHQgOiAwO1xuICAgIHZhciB3LCBoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjsgKytpKSB7XG4gICAgICB3ID0gZ3JhcGgud2lkdGgoKSAtIHNldHRpbmdzKCdwYWRkaW5nJylbMV0gLSBzZXR0aW5ncygncGFkZGluZycpWzNdIC0gXG4gICAgICAgIGF4ZXMueS53aWR0aCgpIC0gbGFiZWxfaGVpZ2h0IC0gcm93bGFiZWxfd2lkdGg7XG4gICAgICB3ID0gKHcgLSAobmNvbC0xKSpzZXR0aW5ncygnc2VwJykpIC8gbmNvbDtcbiAgICAgIGF4ZXMueC53aWR0aCh3KS5kb21haW4oZ3JhcGguZGF0YSgpLCBncmFwaC5zY2hlbWEoKSk7XG4gICAgICBoID0gZ3JhcGguaGVpZ2h0KCkgLSBzZXR0aW5ncygncGFkZGluZycpWzBdIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVsyXSAtIFxuICAgICAgICBheGVzLnguaGVpZ2h0KCkgLSBsYWJlbF9oZWlnaHQgLSBjb2x1bW5sYWJlbF9oZWlnaHQ7XG4gICAgICBoID0gKGggLSAobnJvdy0xKSpzZXR0aW5ncygnc2VwJykpIC8gbnJvdztcbiAgICAgIGF4ZXMueS5oZWlnaHQoaCkuZG9tYWluKGdyYXBoLmRhdGEoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgIH1cbiAgICB2YXIgbCA9IGF4ZXMueS53aWR0aCgpICsgc2V0dGluZ3MoJ3BhZGRpbmcnKVsxXSArIGxhYmVsX2hlaWdodDtcbiAgICB2YXIgdCAgPSBzZXR0aW5ncygncGFkZGluZycpWzJdICsgY29sdW1ubGFiZWxfaGVpZ2h0O1xuICAgIC8vIGNyZWF0ZSBncm91cCBjb250YWluaW5nIGNvbXBsZXRlIGdyYXBoXG4gICAgZyA9IGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJncmFwaCBncmFwaC1cIiArIHR5cGUpO1xuICAgIC8vIGRyYXcgbGFiZWxzXG4gICAgdmFyIHljZW50ZXIgPSB0ICsgMC41KihncmFwaC5oZWlnaHQoKSAtIHNldHRpbmdzKCdwYWRkaW5nJylbMF0gLSBzZXR0aW5ncygncGFkZGluZycpWzJdIC0gXG4gICAgICAgIGF4ZXMueC5oZWlnaHQoKSAtIGxhYmVsX2hlaWdodCk7XG4gICAgdmFyIHhjZW50ZXIgPSBsICsgMC41KihncmFwaC53aWR0aCgpIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVsxXSAtIHNldHRpbmdzKCdwYWRkaW5nJylbM10gLSBcbiAgICAgICAgYXhlcy55LndpZHRoKCkgLSBsYWJlbF9oZWlnaHQpO1xuICAgIGcuYXBwZW5kKFwidGV4dFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJsYWJlbCBsYWJlbC15XCIpXG4gICAgICAuYXR0cihcInhcIiwgc2V0dGluZ3MoJ3BhZGRpbmcnKVsxXSkuYXR0cihcInlcIiwgeWNlbnRlcilcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikudGV4dCh5bGFiZWwpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg5MCBcIiArIHNldHRpbmdzKCdwYWRkaW5nJylbMV0gKyBcIiBcIiArIHljZW50ZXIgKyBcIilcIik7XG4gICAgZy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsIGxhYmVsLXhcIilcbiAgICAgIC5hdHRyKFwieFwiLCB4Y2VudGVyKS5hdHRyKFwieVwiLCBncmFwaC5oZWlnaHQoKS1zZXR0aW5ncygncGFkZGluZycpWzBdKVxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKS50ZXh0KHhsYWJlbCk7XG4gICAgaWYgKGF4ZXMucm93LnZhcmlhYmxlKCkpIHtcbiAgICAgIHZhciB4cm93ID0gZ3JhcGgud2lkdGgoKSAtIHNldHRpbmdzKCdwYWRkaW5nJylbM10gLSBsYWJlbF9oZWlnaHQ7XG4gICAgICB2YXIgdnNjaGVtYXJvdyA9IHZhcmlhYmxlX3NjaGVtYShheGVzLnJvdy52YXJpYWJsZSgpLCBncmFwaC5zY2hlbWEoKSk7XG4gICAgICB2YXIgcm93bGFiZWwgPSB2c2NoZW1hcm93LnRpdGxlO1xuICAgICAgZy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsIGxhYmVsLXlcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIHhyb3cpLmF0dHIoXCJ5XCIsIHljZW50ZXIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikudGV4dChyb3dsYWJlbClcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoOTAgXCIgKyB4cm93ICsgXCIgXCIgKyB5Y2VudGVyICsgXCIpXCIpO1xuICAgIH1cbiAgICBpZiAoYXhlcy5jb2x1bW4udmFyaWFibGUoKSkge1xuICAgICAgdmFyIHZzY2hlbWFjb2x1bW4gPSB2YXJpYWJsZV9zY2hlbWEoYXhlcy5jb2x1bW4udmFyaWFibGUoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgICAgdmFyIGNvbHVtbmxhYmVsID0gdnNjaGVtYWNvbHVtbi50aXRsZTtcbiAgICAgIGcuYXBwZW5kKFwidGV4dFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJsYWJlbCBsYWJlbC15XCIpXG4gICAgICAgIC5hdHRyKFwieFwiLCB4Y2VudGVyKS5hdHRyKFwieVwiLCBzZXR0aW5ncyhcInBhZGRpbmdcIilbMl0pLmF0dHIoXCJkeVwiLCBcIjAuNzFlbVwiKVxuICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLnRleHQoY29sdW1ubGFiZWwpO1xuICAgIH1cbiAgICAvLyBjcmVhdGUgZWFjaCBvZiB0aGUgcGFuZWxzXG4gICAgdmFyIGQgPSBkMy5uZXN0KCkua2V5KG5lc3RfY29sdW1uKS5rZXkobmVzdF9yb3cpLmVudHJpZXMoZ3JhcGguZGF0YSgpKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGRqID0gZFtpXS52YWx1ZXM7XG4gICAgICB0ICA9IHNldHRpbmdzKCdwYWRkaW5nJylbMl0gKyBjb2x1bW5sYWJlbF9oZWlnaHQ7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGRqLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIC8vIGRyYXcgeC1heGlzXG4gICAgICAgIGlmIChqID09IChkai5sZW5ndGgtMSkpIHtcbiAgICAgICAgICBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpcyBheGlzLXhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgbCArIFwiLFwiICsgKHQgKyBoKSArIFwiKVwiKS5jYWxsKGF4ZXMueCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZHJhdyB5LWF4aXNcbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpcyBheGlzLXlcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGwgLSBheGVzLnkud2lkdGgoKSkgKyBcIixcIiArIHQgKyBcIilcIilcbiAgICAgICAgICAgIC5jYWxsKGF4ZXMueSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZHJhdyByb3cgbGFiZWxzXG4gICAgICAgIGlmIChpID09IChkLmxlbmd0aC0xKSAmJiBheGVzLnJvdy52YXJpYWJsZSgpKSB7XG4gICAgICAgICAgdmFyIHJvd3RpY2sgPSBheGVzLnJvdy50aWNrcygpW2pdO1xuICAgICAgICAgIHZhciBncm93ID0gZy5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcImF4aXMgYXhpcy1yb3dcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGwgKyB3KSArIFwiLFwiICsgdCArIFwiKVwiKTtcbiAgICAgICAgICBncm93LmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsIFwiYmFja2dyb3VuZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBsYWJlbF9oZWlnaHQgKyAyKnNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCk7XG4gICAgICAgICAgZ3Jvdy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDApLmF0dHIoXCJ5XCIsIGgvMilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDkwIFwiICsgXG4gICAgICAgICAgICAgIChsYWJlbF9oZWlnaHQgLSBzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSkgKyBcIiBcIiArIGgvMiArIFwiKVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKS5hdHRyKFwiZHlcIiwgXCIwLjM1ZW1cIilcbiAgICAgICAgICAgIC50ZXh0KHJvd3RpY2spO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRyYXcgY29sdW1uIGxhYmVsc1xuICAgICAgICBpZiAoaiA9PT0gMCAmJiBheGVzLmNvbHVtbi52YXJpYWJsZSgpKSB7XG4gICAgICAgICAgdmFyIGNvbHVtbnRpY2sgPSBheGVzLmNvbHVtbi50aWNrcygpW2ldO1xuICAgICAgICAgIHZhciBjb2x0aWNraCA9IGxhYmVsX2hlaWdodCArIDIqc2V0dGluZ3MoXCJ0aWNrX3BhZGRpbmdcIik7XG4gICAgICAgICAgdmFyIGdjb2x1bW4gPSBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpcyBheGlzLWNvbHVtblwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBsICsgXCIsXCIgKyAodCAtIGNvbHRpY2toKSArIFwiKVwiKTtcbiAgICAgICAgICBnY29sdW1uLmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsIFwiYmFja2dyb3VuZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3KVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgbGFiZWxfaGVpZ2h0ICsgMipzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSk7XG4gICAgICAgICAgZ2NvbHVtbi5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHcvMikuYXR0cihcInlcIiwgc2V0dGluZ3MoXCJ0aWNrX3BhZGRpbmdcIikpXG4gICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLmF0dHIoXCJkeVwiLCBcIjAuNzFlbVwiKVxuICAgICAgICAgICAgLnRleHQoY29sdW1udGljayk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZHJhdyBib3ggZm9yIGdyYXBoXG4gICAgICAgIHZhciBnciA9IGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJwYW5lbFwiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgbCArIFwiLFwiICsgdCArIFwiKVwiKTtcbiAgICAgICAgZ3IuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3KS5hdHRyKFwiaGVpZ2h0XCIsIGgpO1xuICAgICAgICAvLyBkcmF3IGdyaWRcbiAgICAgICAgdmFyIHh0aWNrcyA9IGF4ZXMueC50aWNrcygpO1xuICAgICAgICBnci5zZWxlY3RBbGwoXCJsaW5lLmdyaWR4XCIpLmRhdGEoeHRpY2tzKS5lbnRlcigpLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZ3JpZCBncmlkeFwiKVxuICAgICAgICAgIC5hdHRyKFwieDFcIiwgYXhlcy54LnNjYWxlKS5hdHRyKFwieDJcIiwgYXhlcy54LnNjYWxlKVxuICAgICAgICAgIC5hdHRyKFwieTFcIiwgMCkuYXR0cihcInkyXCIsIGgpO1xuICAgICAgICB2YXIgeXRpY2tzID0gYXhlcy55LnRpY2tzKCk7XG4gICAgICAgIGdyLnNlbGVjdEFsbChcImxpbmUuZ3JpZHlcIikuZGF0YSh5dGlja3MpLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJncmlkIGdyaWR5XCIpXG4gICAgICAgICAgLmF0dHIoXCJ4MVwiLCAwKS5hdHRyKFwieDJcIiwgdylcbiAgICAgICAgICAuYXR0cihcInkxXCIsIGF4ZXMueS5zY2FsZSkuYXR0cihcInkyXCIsIGF4ZXMueS5zY2FsZSk7XG4gICAgICAgIC8vIGFkZCBjcm9zc2hhaXJzIHRvIGdyYXBoXG4gICAgICAgIHZhciBnY3Jvc3NoID0gZ3IuYXBwZW5kKFwiZ1wiKS5jbGFzc2VkKFwiY3Jvc3NoYWlyc1wiLCB0cnVlKTtcbiAgICAgICAgZ2Nyb3NzaC5hcHBlbmQoXCJsaW5lXCIpLmNsYXNzZWQoXCJobGluZVwiLCB0cnVlKS5hdHRyKFwieDFcIiwgMClcbiAgICAgICAgICAuYXR0cihcInkxXCIsIDApLmF0dHIoXCJ4MlwiLCBheGVzLngud2lkdGgoKSkuYXR0cihcInkyXCIsIDApXG4gICAgICAgICAgLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICAgICAgZ2Nyb3NzaC5hcHBlbmQoXCJsaW5lXCIpLmNsYXNzZWQoXCJ2bGluZVwiLCB0cnVlKS5hdHRyKFwieDFcIiwgMClcbiAgICAgICAgICAuYXR0cihcInkxXCIsIDApLmF0dHIoXCJ4MlwiLCAwKS5hdHRyKFwieTJcIiwgYXhlcy55LmhlaWdodCgpKVxuICAgICAgICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgICAgIC8vIGRyYXcgcGFuZWxcbiAgICAgICAgZ3JhcGhfcGFuZWwoZ3IsIGRqW2pdLnZhbHVlcyk7XG4gICAgICAgIC8vIG5leHQgcGFuZWxcbiAgICAgICAgdCArPSBheGVzLnkuaGVpZ2h0KCkgKyBzZXR0aW5ncygnc2VwJyk7XG4gICAgICB9XG4gICAgICBsICs9IGF4ZXMueC53aWR0aCgpICsgc2V0dGluZ3MoJ3NlcCcpO1xuICAgIH1cbiAgICAvLyBmaW5pc2hlZCBkcmF3aW5nIGNhbGwgcmVhZHkgZXZlbnRcbiAgICBkaXNwYXRjaC5yZWFkeS5jYWxsKGcpO1xuICB9KTtcblxuICByZXR1cm4gZ3JhcGg7XG59XG4iLCJcbmZ1bmN0aW9uIGdycGhfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIGdyYXBoKSB7XG5cbiAgdmFyIHdpZHRoLCBoZWlnaHQ7XG4gIHZhciBkYXRhLCBzY2hlbWE7XG5cbiAgZ3JhcGguYXhlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkMy5rZXlzKGF4ZXMpO1xuICB9O1xuXG4gIGdyYXBoLndpZHRoID0gZnVuY3Rpb24odykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gd2lkdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpZHRoID0gdztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBncmFwaC5oZWlnaHQgPSBmdW5jdGlvbihoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodCA9IGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgZ3JhcGguYWNjZXB0ID0gZnVuY3Rpb24odmFyaWFibGVzLCBheGlzKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICBpZiAoYXhlc1theGlzXSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gYXhlc1theGlzXS5hY2NlcHQodmFyaWFibGVzLCBzY2hlbWEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpIGluIGF4ZXMpIHtcbiAgICAgICAgaWYgKHZhcmlhYmxlc1tpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKGF4ZXNbaV0ucmVxdWlyZWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgYWNjZXB0ID0gYXhlc1tpXS5hY2NlcHQodmFyaWFibGVzW2ldLCBzY2hlbWEpO1xuICAgICAgICAgIGlmICghYWNjZXB0KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcblxuICBncmFwaC5hc3NpZ24gPSBmdW5jdGlvbih2YXJpYWJsZXMpIHtcbiAgICBmb3IgKHZhciBpIGluIGF4ZXMpIGF4ZXNbaV0udmFyaWFibGUodmFyaWFibGVzW2ldKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBncmFwaC5zY2hlbWEgPSBmdW5jdGlvbihzKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVtYSA9IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgZ3JhcGguZGF0YSA9IGZ1bmN0aW9uKGQsIHMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRhdGEgPSBkO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSBcbiAgICAgICAgZ3JhcGguc2NoZW1hKHMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGdyYXBoLmRpc3BhdGNoID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRpc3BhdGNoO1xuICB9O1xuXG4gIHJldHVybiBncmFwaDtcbn1cblxuIiwiXG5mdW5jdGlvbiBncnBoX2dyYXBoX2JhcigpIHtcblxuICB2YXIgYXhlcyA9IHtcbiAgICAneCcgOiBncnBoX2F4aXNfbGluZWFyKHRydWUpLm9yaWdpbigwKSxcbiAgICAneScgOiBncnBoX2F4aXNfY2F0ZWdvcmljYWwoKSxcbiAgICAnY29sb3VyJzogZ3JwaF9heGlzX2NvbG91cigpLFxuICAgICdjb2x1bW4nIDogZ3JwaF9heGlzX3NwbGl0KCksXG4gICAgJ3JvdycgOiBncnBoX2F4aXNfc3BsaXQoKVxuICB9O1xuICBheGVzLngucmVxdWlyZWQgPSB0cnVlO1xuICBheGVzLnkucmVxdWlyZWQgPSB0cnVlO1xuICB2YXIgZGlzcGF0Y2ggPSBkMy5kaXNwYXRjaChcIm1vdXNlb3ZlclwiLCBcIm1vdXNlb3V0XCIsIFwiY2xpY2tcIiwgXCJyZWFkeVwiKTtcblxuICB2YXIgZ3JhcGggPSBncnBoX2dlbmVyaWNfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIFwiYmFyXCIsIGZ1bmN0aW9uKGcsIGRhdGEpIHtcbiAgICBmdW5jdGlvbiBuZXN0X2NvbG91cihkKSB7XG4gICAgICByZXR1cm4gYXhlcy5jb2xvdXIudmFyaWFibGUoKSA/IGRbYXhlcy5jb2xvdXIudmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRfeChkKSB7XG4gICAgICB2YXIgdiA9IGF4ZXMueC5zY2FsZShkKTtcbiAgICAgIHJldHVybiB2IDwgYXhlcy54LnNjYWxlKG9yaWdpbikgPyB2IDogYXhlcy54LnNjYWxlKG9yaWdpbik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldF93aWR0aChkKSB7XG4gICAgICByZXR1cm4gTWF0aC5hYnMoYXhlcy54LnNjYWxlKGQpIC0gYXhlcy54LnNjYWxlKG9yaWdpbikpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRfeShkKSB7XG4gICAgICByZXR1cm4gYXhlcy55LnNjYWxlLmwoZCkgKyBpKmF4ZXMueS5zY2FsZS53KGQpL25jb2xvdXJzO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRfaGVpZ2h0KGQpIHtcbiAgICAgIHJldHVybiBheGVzLnkuc2NhbGUudyhkKS9uY29sb3VycztcbiAgICB9XG5cbiAgICB2YXIgZCA9IGQzLm5lc3QoKS5rZXkobmVzdF9jb2xvdXIpLmVudHJpZXMoZGF0YSk7XG4gICAgdmFyIG5jb2xvdXJzID0gZC5sZW5ndGg7XG4gICAgdmFyIG9yaWdpbiA9IGF4ZXMueC5vcmlnaW4oKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGQubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBjb2xvdXIgPSBheGVzLmNvbG91ci5zY2FsZShkW2ldLmtleSk7XG4gICAgICBnLnNlbGVjdEFsbChcInJlY3QuXCIgKyBjb2xvdXIpLmRhdGEoZFtpXS52YWx1ZXMpLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiYmFyIFwiICsgY29sb3VyKS5hdHRyKFwieFwiLCBnZXRfeClcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBnZXRfd2lkdGgpLmF0dHIoXCJ5XCIsIGdldF95KS5hdHRyKFwiaGVpZ2h0XCIsIGdldF9oZWlnaHQpO1xuICAgIH1cbiAgICBnLmFwcGVuZChcImxpbmVcIikuYXR0cihcImNsYXNzXCIsIFwib3JpZ2luXCIpXG4gICAgICAuYXR0cihcIngxXCIsIGF4ZXMueC5zY2FsZShvcmlnaW4pKVxuICAgICAgLmF0dHIoXCJ4MlwiLCBheGVzLnguc2NhbGUob3JpZ2luKSlcbiAgICAgIC5hdHRyKFwieTFcIiwgMCkuYXR0cihcInkyXCIsIGF4ZXMueS5oZWlnaHQoKSk7XG4gIH0pO1xuXG4gIC8vIHdoZW4gZmluaXNoZWQgZHJhd2luZyBncmFwaDsgYWRkIGV2ZW50IGhhbmRsZXJzIFxuICBkaXNwYXRjaC5vbihcInJlYWR5XCIsIGZ1bmN0aW9uKCkge1xuICAgIC8vIGFkZCBob3ZlciBldmVudHMgdG8gdGhlIGxpbmVzIGFuZCBwb2ludHNcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuY29sb3VyXCIpLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHZhciB2YXJpYWJsZSA9IGF4ZXMuY29sb3VyLnZhcmlhYmxlKCk7XG4gICAgICB2YXIgdmFsdWUgPSB2YXJpYWJsZSA/IChkLmtleSB8fCBkW3ZhcmlhYmxlXSkgOiB1bmRlZmluZWQ7XG4gICAgICBkaXNwYXRjaC5tb3VzZW92ZXIuY2FsbChzZWxmLCB2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLm1vdXNlb3V0LmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHZhciB2YXJpYWJsZSA9IGF4ZXMuY29sb3VyLnZhcmlhYmxlKCk7XG4gICAgICB2YXIgdmFsdWUgPSB2YXJpYWJsZSA/IChkLmtleSB8fCBkW3ZhcmlhYmxlXSkgOiB1bmRlZmluZWQ7XG4gICAgICBkaXNwYXRjaC5jbGljay5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIExvY2FsIGV2ZW50IGhhbmRsZXJzXG4gIGRpc3BhdGNoLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgIGlmICh2YXJpYWJsZSkge1xuICAgICAgdmFyIGNsYXNzZXMgPSBheGVzLmNvbG91ci5zY2FsZShcIlwiICsgdmFsdWUpO1xuICAgICAgdmFyIHJlZ2V4cCA9IC9cXGJjb2xvdXIoWzAtOV0rKVxcYi87XG4gICAgICB2YXIgY29sb3VyID0gcmVnZXhwLmV4ZWMoY2xhc3NlcylbMF07XG4gICAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikuY2xhc3NlZChcImNvbG91cmxvd1wiLCB0cnVlKTtcbiAgICAgIHRoaXMuc2VsZWN0QWxsKFwiLlwiICsgY29sb3VyKS5jbGFzc2VkKHtcImNvbG91cmhpZ2hcIjogdHJ1ZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuaGxpbmVcIikuYXR0cihcInkxXCIsIGF4ZXMueS5zY2FsZShkKSkuYXR0cihcInkyXCIsIGF4ZXMueS5zY2FsZShkKSlcbiAgICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLnZsaW5lXCIpLmF0dHIoXCJ4MVwiLCBheGVzLnguc2NhbGUoZCkpLmF0dHIoXCJ4MlwiLCBheGVzLnguc2NhbGUoZCkpXG4gICAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgfSk7XG4gIGRpc3BhdGNoLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuY29sb3VyXCIpLmNsYXNzZWQoe1wiY29sb3VyaGlnaFwiOiBmYWxzZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5obGluZVwiKS5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIudmxpbmVcIikuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICB9KTtcblxuICAvLyBUb29sdGlwXG4gIC8vIHdoZW4gZDMudGlwIGlzIGxvYWRlZFxuICBpZiAoZDMudGlwICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgdGlwID0gZDMudGlwKCkuZGlyZWN0aW9uKFwic2VcIikuYXR0cignY2xhc3MnLCAndGlwIHRpcC1iYXInKS5odG1sKGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkgeyBcbiAgICAgIHZhciBzY2hlbWEgPSBncmFwaC5zY2hlbWEoKTtcbiAgICAgIHZhciBmb3JtYXQgPSB2YWx1ZV9mb3JtYXR0ZXIoc2NoZW1hKTtcbiAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgIGZvciAodmFyIGkgaW4gc2NoZW1hLmZpZWxkcykge1xuICAgICAgICB2YXIgZmllbGQgPSBzY2hlbWEuZmllbGRzW2ldO1xuICAgICAgICBzdHIgKz0gZmllbGQudGl0bGUgKyAnOiAnICsgZm9ybWF0KGQsIGZpZWxkLm5hbWUpICsgJzwvYnI+JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJyZWFkeS50aXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNhbGwodGlwKTtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcIm1vdXNlb3Zlci50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuc2hvdyh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwibW91c2VvdXQudGlwXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgICAgdGlwLmhpZGUodmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxuZnVuY3Rpb24gZ3JwaF9ncmFwaF9idWJibGUoKSB7XG5cbiAgdmFyIGF4ZXMgPSB7XG4gICAgJ3gnIDogZ3JwaF9heGlzX2xpbmVhcih0cnVlKSxcbiAgICAneScgOiBncnBoX2F4aXNfbGluZWFyKGZhbHNlKSxcbiAgICAnb2JqZWN0JyA6IGdycGhfYXhpc19jb2xvdXIoKSxcbiAgICAnc2l6ZScgICA6IGdycGhfYXhpc19zaXplKCksXG4gICAgJ2NvbG91cicgOiBncnBoX2F4aXNfY29sb3VyKCksXG4gICAgJ2NvbHVtbicgOiBncnBoX2F4aXNfc3BsaXQoKSxcbiAgICAncm93JyA6IGdycGhfYXhpc19zcGxpdCgpXG4gIH07XG4gIGF4ZXMueC5yZXF1aXJlZCA9IHRydWU7XG4gIGF4ZXMueS5yZXF1aXJlZCA9IHRydWU7XG4gIGF4ZXMub2JqZWN0LnJlcXVpcmVkID0gdHJ1ZTtcbiAgdmFyIGRpc3BhdGNoID0gZDMuZGlzcGF0Y2goXCJtb3VzZW92ZXJcIiwgXCJtb3VzZW91dFwiLCBcImNsaWNrXCIsIFwicmVhZHlcIik7XG5cbiAgdmFyIGdyYXBoID0gZ3JwaF9nZW5lcmljX2dyYXBoKGF4ZXMsIGRpc3BhdGNoLCBcImJ1YmJsZVwiLCBmdW5jdGlvbihnLCBkYXRhKSB7XG4gICAgZnVuY3Rpb24gbmVzdF9vYmplY3QoZCkge1xuICAgICAgcmV0dXJuIGF4ZXMub2JqZWN0LnZhcmlhYmxlKCkgPyBkW2F4ZXMub2JqZWN0LnZhcmlhYmxlKCldIDogMTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbmVzdF9jb2xvdXIoZCkge1xuICAgICAgcmV0dXJuIGF4ZXMuY29sb3VyLnZhcmlhYmxlKCkgPyBkW2F4ZXMuY29sb3VyLnZhcmlhYmxlKCldIDogMTtcbiAgICB9XG4gICAgdmFyIGQgPSBkMy5uZXN0KCkua2V5KG5lc3RfY29sb3VyKS5lbnRyaWVzKGRhdGEpO1xuICAgIC8vIGRyYXcgYnViYmxlcyBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGQubGVuZ3RoOyArK2kpIHtcbiAgICAgIGcuc2VsZWN0QWxsKFwiY2lyY2xlLmJ1YmJsZVwiICsgaSkuZGF0YShkW2ldLnZhbHVlcykuZW50ZXIoKS5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJ1YmJsZSBidWJibGVcIiArIGkgKyBcIiBcIiArIGF4ZXMuY29sb3VyLnNjYWxlKGRbaV0ua2V5KSlcbiAgICAgICAgLmF0dHIoXCJjeFwiLCBheGVzLnguc2NhbGUpLmF0dHIoXCJjeVwiLCBheGVzLnkuc2NhbGUpXG4gICAgICAgIC5hdHRyKFwiclwiLCBheGVzLnNpemUuc2NhbGUpO1xuICAgIH1cbiAgICAvLyBkcmF3IGxpbmVzXG4gICAgZy5zZWxlY3RBbGwoXCJnLmxpbmVcIikuZGF0YShsaW5lcykuZW50ZXIoKS5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcImxpbmVcIilcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKGQpIHsgZC5kcmF3KHRoaXMsIGQsIGF4ZXMpO30pO1xuICB9KTtcblxuXG4gIC8vIHdoZW4gZmluaXNoZWQgZHJhd2luZyBncmFwaDsgYWRkIGV2ZW50IGhhbmRsZXJzIFxuICBkaXNwYXRjaC5vbihcInJlYWR5XCIsIGZ1bmN0aW9uKCkge1xuICAgIC8vIGFkZCBob3ZlciBldmVudHMgdG8gdGhlIGxpbmVzIGFuZCBwb2ludHNcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuY29sb3VyXCIpLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHZhciB2YXJpYWJsZSA9IGF4ZXMuY29sb3VyLnZhcmlhYmxlKCk7XG4gICAgICB2YXIgdmFsdWUgPSB2YXJpYWJsZSA/IChkLmtleSB8fCBkW3ZhcmlhYmxlXSkgOiB1bmRlZmluZWQ7XG4gICAgICBkaXNwYXRjaC5tb3VzZW92ZXIuY2FsbChzZWxmLCB2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLm1vdXNlb3V0LmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHZhciB2YXJpYWJsZSA9IGF4ZXMuY29sb3VyLnZhcmlhYmxlKCk7XG4gICAgICB2YXIgdmFsdWUgPSB2YXJpYWJsZSA/IChkLmtleSB8fCBkW3ZhcmlhYmxlXSkgOiB1bmRlZmluZWQ7XG4gICAgICBkaXNwYXRjaC5jbGljay5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIExvY2FsIGV2ZW50IGhhbmRsZXJzXG4gIGRpc3BhdGNoLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgIGlmICh2YXJpYWJsZSkge1xuICAgICAgdmFyIGNsYXNzZXMgPSBheGVzLmNvbG91ci5zY2FsZShcIlwiICsgdmFsdWUpO1xuICAgICAgdmFyIHJlZ2V4cCA9IC9cXGJjb2xvdXIoWzAtOV0rKVxcYi87XG4gICAgICB2YXIgY29sb3VyID0gcmVnZXhwLmV4ZWMoY2xhc3NlcylbMF07XG4gICAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikuY2xhc3NlZChcImNvbG91cmxvd1wiLCB0cnVlKTtcbiAgICAgIHRoaXMuc2VsZWN0QWxsKFwiLlwiICsgY29sb3VyKS5jbGFzc2VkKHtcImNvbG91cmhpZ2hcIjogdHJ1ZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuaGxpbmVcIikuYXR0cihcInkxXCIsIGF4ZXMueS5zY2FsZShkKSkuYXR0cihcInkyXCIsIGF4ZXMueS5zY2FsZShkKSlcbiAgICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLnZsaW5lXCIpLmF0dHIoXCJ4MVwiLCBheGVzLnguc2NhbGUoZCkpLmF0dHIoXCJ4MlwiLCBheGVzLnguc2NhbGUoZCkpXG4gICAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgfSk7XG4gIGRpc3BhdGNoLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuY29sb3VyXCIpLmNsYXNzZWQoe1wiY29sb3VyaGlnaFwiOiBmYWxzZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5obGluZVwiKS5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIudmxpbmVcIikuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICB9KTtcblxuICAvLyBUb29sdGlwXG4gIC8vIHdoZW4gZDMudGlwIGlzIGxvYWRlZFxuICBpZiAoZDMudGlwICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgdGlwID0gZDMudGlwKCkuZGlyZWN0aW9uKFwic2VcIikuYXR0cignY2xhc3MnLCAndGlwIHRpcC1idWJibGUnKS5odG1sKGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkgeyBcbiAgICAgIHZhciBzY2hlbWEgPSBncmFwaC5zY2hlbWEoKTtcbiAgICAgIHZhciBmb3JtYXQgPSB2YWx1ZV9mb3JtYXR0ZXIoc2NoZW1hKTtcbiAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgIGZvciAodmFyIGkgaW4gc2NoZW1hLmZpZWxkcykge1xuICAgICAgICB2YXIgZmllbGQgPSBzY2hlbWEuZmllbGRzW2ldO1xuICAgICAgICBzdHIgKz0gZmllbGQudGl0bGUgKyAnOiAnICsgZm9ybWF0KGQsIGZpZWxkLm5hbWUpICsgJzwvYnI+JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJyZWFkeS50aXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNhbGwodGlwKTtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcIm1vdXNlb3Zlci50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuc2hvdyh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwibW91c2VvdXQudGlwXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgICAgdGlwLmhpZGUodmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgfVxuXG4gIFxuICB2YXIgbGluZXMgPSBbXTtcbiAgZ3JhcGguYWRkX2hsaW5lID0gZnVuY3Rpb24oaCwgY2xhc3NuYW1lKSB7XG4gICAgZnVuY3Rpb24gZHJhd19obGluZShnLCBkYXRhLCBheGVzKSB7XG4gICAgICB2YXIgeG1pbiA9IGF4ZXMueC5zY2FsZShheGVzLnguZG9tYWluKClbMF0pO1xuICAgICAgdmFyIHhtYXggPSBheGVzLnguc2NhbGUoYXhlcy54LmRvbWFpbigpWzFdKTtcbiAgICAgIGQzLnNlbGVjdChnKS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgIC5hdHRyKFwieDFcIiwgeG1pbikuYXR0cihcIngyXCIsIHhtYXgpXG4gICAgICAgIC5hdHRyKFwieTFcIiwgYXhlcy55LnNjYWxlKGRhdGEuaCkpXG4gICAgICAgIC5hdHRyKFwieTJcIiwgYXhlcy55LnNjYWxlKGRhdGEuaCkpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZGF0YVsnY2xhc3MnXSk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goe2RyYXcgOiBkcmF3X2hsaW5lLCBoIDogaCwgJ2NsYXNzJyA6IGNsYXNzbmFtZX0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICBncmFwaC5hZGRfYWJsaW5lID0gZnVuY3Rpb24oYSwgYiwgY2xhc3NuYW1lKSB7XG4gICAgZnVuY3Rpb24gZHJhd19obGluZShnLCBkYXRhLCBheGVzKSB7XG4gICAgICB2YXIgZG9tYWluID0gYXhlcy54LmRvbWFpbigpO1xuICAgICAgZDMuc2VsZWN0KGcpLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgLmF0dHIoXCJ4MVwiLCBheGVzLnguc2NhbGUoZG9tYWluWzBdKSlcbiAgICAgICAgLmF0dHIoXCJ4MlwiLCBheGVzLnguc2NhbGUoZG9tYWluWzFdKSlcbiAgICAgICAgLmF0dHIoXCJ5MVwiLCBheGVzLnkuc2NhbGUoYSArIGIgKiBkb21haW5bMF0pKVxuICAgICAgICAuYXR0cihcInkyXCIsIGF4ZXMueS5zY2FsZShhICsgYiAqIGRvbWFpblsxXSkpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZGF0YVsnY2xhc3MnXSk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goe2RyYXcgOiBkcmF3X2hsaW5lLCBhIDogYSwgYjogYiwgJ2NsYXNzJyA6IGNsYXNzbmFtZX0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG5cbiAgcmV0dXJuIGdyYXBoO1xufVxuXG4iLCJcbmZ1bmN0aW9uIGdycGhfZ3JhcGhfbGluZSgpIHtcblxuICB2YXIgYXhlcyA9IHtcbiAgICAneCcgOiBncnBoX2F4aXNfc3dpdGNoKFtncnBoX2F4aXNfbGluZWFyKHRydWUpLCBncnBoX2F4aXNfcGVyaW9kKCldKSxcbiAgICAneScgOiBncnBoX2F4aXNfbGluZWFyKGZhbHNlKSxcbiAgICAnY29sb3VyJyA6IGdycGhfYXhpc19jb2xvdXIoKSxcbiAgICAnY29sdW1uJyA6IGdycGhfYXhpc19zcGxpdCgpLFxuICAgICdyb3cnIDogZ3JwaF9heGlzX3NwbGl0KClcbiAgfTtcbiAgYXhlcy54LnJlcXVpcmVkID0gdHJ1ZTtcbiAgYXhlcy55LnJlcXVpcmVkID0gdHJ1ZTtcbiAgdmFyIGRpc3BhdGNoID0gZDMuZGlzcGF0Y2goXCJtb3VzZW92ZXJcIiwgXCJtb3VzZW91dFwiLCBcInBvaW50b3ZlclwiLCBcInBvaW50b3V0XCIsXG4gICAgXCJjbGlja1wiLCBcInJlYWR5XCIpO1xuXG4gIHZhciBwb2ludF9zaXplID0gc2V0dGluZ3MoJ3BvaW50X3NpemUnKTtcblxuICB2YXIgZ3JhcGggPSBncnBoX2dlbmVyaWNfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIFwibGluZVwiLCBmdW5jdGlvbihnLCBkYXRhKSB7XG4gICAgZnVuY3Rpb24gbmVzdF9jb2xvdXIoZCkge1xuICAgICAgcmV0dXJuIGF4ZXMuY29sb3VyLnZhcmlhYmxlKCkgPyBkW2F4ZXMuY29sb3VyLnZhcmlhYmxlKCldIDogMTtcbiAgICB9XG4gICAgcG9pbnRfc2l6ZSA9IHNldHRpbmdzKCdwb2ludF9zaXplJyk7XG5cbiAgICB2YXIgZCA9IGQzLm5lc3QoKS5rZXkobmVzdF9jb2xvdXIpLmVudHJpZXMoZGF0YSk7XG4gICAgLy8gZHJhdyBsaW5lcyBcbiAgICB2YXIgeV92YXIgPSBheGVzLnkudmFyaWFibGUoKTtcbiAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKCkueChheGVzLnguc2NhbGUpLnkoYXhlcy55LnNjYWxlKTtcbiAgICBcbiAgICB2YXIgbm90X2VtcHR5ID0gZnVuY3Rpb24oZCl7XG4gICAgICByZXR1cm4gKGRbeV92YXJdICE9PSBudWxsICYmIGlzRmluaXRlKGRbeV92YXJdKSk7XG4gICAgfTtcblxuICAgIGxpbmUuZGVmaW5lZChub3RfZW1wdHkpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkLmxlbmd0aDsgKytpKSB7XG4gICAgICBnLmFwcGVuZChcInBhdGhcIikuYXR0cihcImRcIiwgbGluZShkW2ldLnZhbHVlcykpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgYXhlcy5jb2xvdXIuc2NhbGUoZFtpXS5rZXkpKVxuICAgICAgICAuZGF0dW0oZFtpXSk7XG4gICAgfVxuXG4gICAgLy8gZHJhdyBwb2ludHMgXG4gICAgaWYgKGQubGVuZ3RoID4gMCl7XG4gICAgICB2YXIgTiA9IGRbMF0udmFsdWVzLmxlbmd0aDtcbiAgICAgIHBvaW50X3NpemUgPSBNYXRoLm1pbihwb2ludF9zaXplLCAoYXhlcy54LndpZHRoKCkpIC8gKDMqTikpO1xuICAgICAgcG9pbnRfc2l6ZSA9IE1hdGgubWF4KDAsIHBvaW50X3NpemUpO1xuICAgICAgY29uc29sZS5sb2coXCJwb2ludCBzaXplXCIsIHBvaW50X3NpemUpO1xuICAgIH1cbiAgICAvL3BvaW50X3NpemUgPSAxO1xuICAgIGZvciAoaSA9IDA7IGkgPCBkLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgY2xzID0gXCJjaXJjbGVcIiArIGk7XG4gICAgICBnLnNlbGVjdEFsbChcImNpcmNsZS5jaXJjbGVcIiArIGkpLmRhdGEoZFtpXS52YWx1ZXMuZmlsdGVyKG5vdF9lbXB0eSkpXG4gICAgICAgLmVudGVyKClcbiAgICAgICAgLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImNpcmNsZVwiICsgaSArIFwiIFwiICsgYXhlcy5jb2xvdXIuc2NhbGUoZFtpXS5rZXkpKVxuICAgICAgICAgLmF0dHIoXCJjeFwiLCBheGVzLnguc2NhbGUpLmF0dHIoXCJjeVwiLCBheGVzLnkuc2NhbGUpXG4gICAgICAgICAuYXR0cihcInJcIiwgcG9pbnRfc2l6ZSk7XG4gICAgfVxuICB9KTtcblxuICAvLyB3aGVuIGZpbmlzaGVkIGRyYXdpbmcgZ3JhcGg7IGFkZCBldmVudCBoYW5kbGVycyBcbiAgZGlzcGF0Y2gub24oXCJyZWFkeVwiLCBmdW5jdGlvbigpIHtcbiAgICAvLyBhZGQgaG92ZXIgZXZlbnRzIHRvIHRoZSBsaW5lcyBhbmQgcG9pbnRzXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmNvbG91clwiKS5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGVzLmNvbG91ci52YXJpYWJsZSgpO1xuICAgICAgdmFyIHZhbHVlID0gdmFyaWFibGUgPyAoZC5rZXkgfHwgZFt2YXJpYWJsZV0pIDogdW5kZWZpbmVkO1xuICAgICAgZGlzcGF0Y2gubW91c2VvdmVyLmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICAgIGlmICghZC5rZXkpIGRpc3BhdGNoLnBvaW50b3Zlci5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCwgZDMuc2VsZWN0KHRoaXMpKTtcbiAgICB9KS5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHZhciB2YXJpYWJsZSA9IGF4ZXMuY29sb3VyLnZhcmlhYmxlKCk7XG4gICAgICB2YXIgdmFsdWUgPSB2YXJpYWJsZSA/IChkLmtleSB8fCBkW3ZhcmlhYmxlXSkgOiB1bmRlZmluZWQ7XG4gICAgICBkaXNwYXRjaC5tb3VzZW91dC5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgICBpZiAoIWQua2V5KSBkaXNwYXRjaC5wb2ludG91dC5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCwgZDMuc2VsZWN0KHRoaXMpKTtcbiAgICB9KS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHZhciB2YXJpYWJsZSA9IGF4ZXMuY29sb3VyLnZhcmlhYmxlKCk7XG4gICAgICB2YXIgdmFsdWUgPSB2YXJpYWJsZSA/IChkLmtleSB8fCBkW3ZhcmlhYmxlXSkgOiB1bmRlZmluZWQ7XG4gICAgICBkaXNwYXRjaC5jbGljay5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBMb2NhbCBldmVudCBoYW5kbGVyc1xuICAvLyBIaWdobGlnaHRpbmcgb2Ygc2VsZWN0ZWQgbGluZVxuICBkaXNwYXRjaC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICBpZiAodmFyaWFibGUpIHtcbiAgICAgIHZhciBjbGFzc2VzID0gYXhlcy5jb2xvdXIuc2NhbGUoXCJcIiArIHZhbHVlKTtcbiAgICAgIHZhciByZWdleHAgPSAvXFxiY29sb3VyKFswLTldKylcXGIvO1xuICAgICAgdmFyIGNvbG91ciA9IHJlZ2V4cC5leGVjKGNsYXNzZXMpWzBdO1xuICAgICAgdGhpcy5zZWxlY3RBbGwoXCIuY29sb3VyXCIpLmNsYXNzZWQoXCJjb2xvdXJsb3dcIiwgdHJ1ZSk7XG4gICAgICB0aGlzLnNlbGVjdEFsbChcIi5cIiArIGNvbG91cikuY2xhc3NlZCh7XCJjb2xvdXJoaWdoXCI6IHRydWUsIFwiY29sb3VybG93XCI6IGZhbHNlfSk7XG4gICAgfVxuICB9KTtcbiAgZGlzcGF0Y2gub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikuY2xhc3NlZCh7XCJjb2xvdXJoaWdoXCI6IGZhbHNlLCBcImNvbG91cmxvd1wiOiBmYWxzZX0pO1xuICB9KTtcblxuICAvLyBTaG93IGNyb3NzaGFpcnMgd2hlbiBob3ZlcmluZyBvdmVyIGEgcG9pbnRcbiAgZGlzcGF0Y2gub24oXCJwb2ludG92ZXJcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkLCBwb2ludCkge1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmhsaW5lXCIpLmF0dHIoXCJ5MVwiLCBheGVzLnkuc2NhbGUoZCkpLmF0dHIoXCJ5MlwiLCBheGVzLnkuc2NhbGUoZCkpXG4gICAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi52bGluZVwiKS5hdHRyKFwieDFcIiwgYXhlcy54LnNjYWxlKGQpKS5hdHRyKFwieDJcIiwgYXhlcy54LnNjYWxlKGQpKVxuICAgICAgLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcInZpc2libGVcIik7XG4gICAgcG9pbnQuYXR0cihcInJcIiwgMSk7IFxuICBcbiAgfSk7XG4gIGRpc3BhdGNoLm9uKFwicG9pbnRvdXRcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkLCBwb2ludCkge1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmhsaW5lXCIpLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi52bGluZVwiKS5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcG9pbnQuYXR0cihcInJcIiwgcG9pbnRfc2l6ZSk7XG4gIH0pO1xuXG4gIC8vIFRvb2x0aXBcbiAgLy8gd2hlbiBkMy50aXAgaXMgbG9hZGVkXG4gIGlmIChkMy50aXAgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciB0aXAgPSBkMy50aXAoKS5kaXJlY3Rpb24oXCJzZVwiKS5hdHRyKCdjbGFzcycsICd0aXAgdGlwLWxpbmUnKS5odG1sKGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkgeyBcbiAgICAgIHZhciBzY2hlbWEgPSBncmFwaC5zY2hlbWEoKTtcbiAgICAgIHZhciBmb3JtYXQgPSB2YWx1ZV9mb3JtYXR0ZXIoc2NoZW1hKTtcbiAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgIGZvciAodmFyIGkgaW4gc2NoZW1hLmZpZWxkcykge1xuICAgICAgICB2YXIgZmllbGQgPSBzY2hlbWEuZmllbGRzW2ldO1xuICAgICAgICBzdHIgKz0gZmllbGQudGl0bGUgKyAnOiAnICsgZm9ybWF0KGQsZmllbGQubmFtZSkgKyAnPC9icj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcInJlYWR5LnRpcFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2FsbCh0aXApO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwicG9pbnRvdmVyLnRpcFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICAgIHRpcC5zaG93KHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJwb2ludG91dC50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuaGlkZSh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGdyYXBoO1xufVxuXG4iLCJcblxuZnVuY3Rpb24gZ3JwaF9ncmFwaF9tYXAoKSB7XG5cbiAgdmFyIGF4ZXMgPSB7XG4gICAgJ3JlZ2lvbicgOiBncnBoX2F4aXNfcmVnaW9uKCksXG4gICAgJ2NvbG91cicgOiBncnBoX2F4aXNfY2hsb3JvcGxldGgoKSxcbiAgICAnY29sdW1uJyA6IGdycGhfYXhpc19zcGxpdCgpLFxuICAgICdyb3cnIDogZ3JwaF9heGlzX3NwbGl0KClcbiAgfTtcbiAgYXhlcy5yZWdpb24ucmVxdWlyZWQgPSB0cnVlO1xuICBheGVzLmNvbG91ci5yZXF1aXJlZCA9IHRydWU7XG4gIHZhciBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKFwicmVhZHlcIiwgXCJtb3VzZW92ZXJcIiwgXCJtb3VzZW91dFwiLCBcImNsaWNrXCIpO1xuXG4gIHZhciBkdW1teV8gPSBkMy5zZWxlY3QoXCJib2R5XCIpLmFwcGVuZChcInN2Z1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJkdW1teSBncmFwaCBncmFwaC1tYXBcIilcbiAgICAuYXR0cihcIndpZHRoXCIsIDApLmF0dHIoXCJoZWlnaHRcIiwgMClcbiAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICB2YXIgbGFiZWxfc2l6ZV8gPSBncnBoX2xhYmVsX3NpemUoZHVtbXlfKTtcblxuXG4gIHZhciBncmFwaCA9IGdycGhfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIGZ1bmN0aW9uKGcpIHtcbiAgICBmdW5jdGlvbiBuZXN0X2NvbHVtbihkKSB7XG4gICAgICByZXR1cm4gYXhlcy5jb2x1bW4udmFyaWFibGUoKSA/IGRbYXhlcy5jb2x1bW4udmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICBmdW5jdGlvbiBuZXN0X3JvdyhkKSB7XG4gICAgICByZXR1cm4gYXhlcy5yb3cudmFyaWFibGUoKSA/IGRbYXhlcy5yb3cudmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICAvLyBzZXR1cCBheGVzXG4gICAgYXhlcy5yZWdpb24uZG9tYWluKGdyYXBoLmRhdGEoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgIGF4ZXMuY29sb3VyLmRvbWFpbihncmFwaC5kYXRhKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICBheGVzLmNvbHVtbi5kb21haW4oZ3JhcGguZGF0YSgpLCBncmFwaC5zY2hlbWEoKSk7XG4gICAgYXhlcy5yb3cuZG9tYWluKGdyYXBoLmRhdGEoKSwgZ3JhcGguc2NoZW1hKCkpO1xuXG4gICAgLy8gZGV0ZXJtaW5lIG51bWJlciBvZiByb3dzIGFuZCBjb2x1bW5zXG4gICAgdmFyIG5jb2wgPSBheGVzLmNvbHVtbi52YXJpYWJsZSgpID8gYXhlcy5jb2x1bW4udGlja3MoKS5sZW5ndGggOiAxO1xuICAgIHZhciBucm93ID0gYXhlcy5yb3cudmFyaWFibGUoKSA/IGF4ZXMucm93LnRpY2tzKCkubGVuZ3RoIDogMTtcbiAgICAvLyBzZXQgdGhlIHdpZHRoLCBoZWlnaHQgZW5kIGRvbWFpbiBvZiB0aGUgeC0gYW5kIHktYXhlc1xuICAgIHZhciBsYWJlbF9oZWlnaHQgPSBsYWJlbF9zaXplXy5oZWlnaHQoXCJ2YXJpYWJsZVwiKSArIHNldHRpbmdzKCdsYWJlbF9wYWRkaW5nJyk7XG4gICAgdmFyIHJvd2xhYmVsX3dpZHRoID0gYXhlcy5yb3cudmFyaWFibGUoKSA/IDMqbGFiZWxfaGVpZ2h0IDogMDtcbiAgICB2YXIgY29sdW1ubGFiZWxfaGVpZ2h0ID0gYXhlcy5jb2x1bW4udmFyaWFibGUoKSA/IDMqbGFiZWxfaGVpZ2h0IDogMDtcbiAgICB2YXIgdyA9IChncmFwaC53aWR0aCgpIC0gc2V0dGluZ3MoXCJwYWRkaW5nXCIsIFwibWFwXCIpWzFdIC0gc2V0dGluZ3MoXCJwYWRkaW5nXCIsIFwibWFwXCIpWzNdIC0gXG4gICAgICByb3dsYWJlbF93aWR0aCAtIChuY29sLTEpKnNldHRpbmdzKFwic2VwXCIsIFwibWFwXCIpKS9uY29sO1xuICAgIHZhciBoID0gKGdyYXBoLmhlaWdodCgpIC0gc2V0dGluZ3MoXCJwYWRkaW5nXCIsIFwibWFwXCIpWzBdIC0gc2V0dGluZ3MoXCJwYWRkaW5nXCIsIFwibWFwXCIpWzJdIC0gXG4gICAgICBjb2x1bW5sYWJlbF9oZWlnaHQgLSAobnJvdy0xKSpzZXR0aW5ncyhcInNlcFwiLCBcIm1hcFwiKSkvbnJvdztcbiAgICB2YXIgbCA9IHNldHRpbmdzKFwicGFkZGluZ1wiLCBcIm1hcFwiKVsxXTtcbiAgICB2YXIgdCAgPSBzZXR0aW5ncyhcInBhZGRpbmdcIiwgXCJtYXBcIilbMl07XG4gICAgYXhlcy5yZWdpb24ud2lkdGgodykuaGVpZ2h0KGgpO1xuICAgIC8vIGNyZWF0ZSBncm91cCBjb250YWluaW5nIGNvbXBsZXRlIGdyYXBoXG4gICAgZyA9IGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJncmFwaCBncmFwaC1tYXBcIik7XG4gICAgLy8gZHJhdyBsYWJlbHNcbiAgICB2YXIgeWNlbnRlciA9IHQgKyAwLjUqKGdyYXBoLmhlaWdodCgpIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVswXSAtIHNldHRpbmdzKCdwYWRkaW5nJylbMl0gLSBcbiAgICAgICAgbGFiZWxfaGVpZ2h0IC0gY29sdW1ubGFiZWxfaGVpZ2h0KSArIGNvbHVtbmxhYmVsX2hlaWdodDtcbiAgICB2YXIgeGNlbnRlciA9IGwgKyAwLjUqKGdyYXBoLndpZHRoKCkgLSBzZXR0aW5ncygncGFkZGluZycpWzFdIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVszXSAtIFxuICAgICAgICBsYWJlbF9oZWlnaHQgLSByb3dsYWJlbF93aWR0aCk7XG4gICAgaWYgKGF4ZXMucm93LnZhcmlhYmxlKCkpIHtcbiAgICAgIHZhciB4cm93ID0gZ3JhcGgud2lkdGgoKSAtIHNldHRpbmdzKCdwYWRkaW5nJylbM10gLSBsYWJlbF9oZWlnaHQ7XG4gICAgICB2YXIgdnNjaGVtYXJvdyA9IHZhcmlhYmxlX3NjaGVtYShheGVzLnJvdy52YXJpYWJsZSgpLCBzY2hlbWEpO1xuICAgICAgdmFyIHJvd2xhYmVsID0gdnNjaGVtYXJvdy50aXRsZTtcbiAgICAgIGcuYXBwZW5kKFwidGV4dFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJsYWJlbCBsYWJlbC15XCIpXG4gICAgICAgIC5hdHRyKFwieFwiLCB4cm93KS5hdHRyKFwieVwiLCB5Y2VudGVyKVxuICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLnRleHQocm93bGFiZWwpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDkwIFwiICsgeHJvdyArIFwiIFwiICsgeWNlbnRlciArIFwiKVwiKTtcbiAgICB9XG4gICAgaWYgKGF4ZXMuY29sdW1uLnZhcmlhYmxlKCkpIHtcbiAgICAgIHZhciB2c2NoZW1hY29sdW1uID0gdmFyaWFibGVfc2NoZW1hKGF4ZXMuY29sdW1uLnZhcmlhYmxlKCksIHNjaGVtYSk7XG4gICAgICB2YXIgY29sdW1ubGFiZWwgPSB2c2NoZW1hY29sdW1uLnRpdGxlO1xuICAgICAgZy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsIGxhYmVsLXlcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIHhjZW50ZXIpLmF0dHIoXCJ5XCIsIHNldHRpbmdzKFwicGFkZGluZ1wiKVsyXSkuYXR0cihcImR5XCIsIFwiMC43MWVtXCIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikudGV4dChjb2x1bW5sYWJlbCk7XG4gICAgfVxuICAgIC8vIGRyYXcgZ3JhcGhzXG4gICAgd2FpdF9mb3IoYXhlcy5yZWdpb24ubWFwX2xvYWRlZCwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZCA9IGQzLm5lc3QoKS5rZXkobmVzdF9jb2x1bW4pLmtleShuZXN0X3JvdykuZW50cmllcyhncmFwaC5kYXRhKCkpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBkaiA9IGRbaV0udmFsdWVzO1xuICAgICAgICB2YXIgdCAgPSBzZXR0aW5ncyhcInBhZGRpbmdcIiwgXCJtYXBcIilbMl0gKyBjb2x1bW5sYWJlbF9oZWlnaHQ7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAvLyBkcmF3IHJvdyBsYWJlbHNcbiAgICAgICAgICBpZiAoaSA9PSAoZC5sZW5ndGgtMSkgJiYgYXhlcy5yb3cudmFyaWFibGUoKSkge1xuICAgICAgICAgICAgdmFyIHJvd3RpY2sgPSBheGVzLnJvdy50aWNrcygpW2pdO1xuICAgICAgICAgICAgdmFyIGdyb3cgPSBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpcyBheGlzLXJvd1wiKVxuICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChsICsgdykgKyBcIixcIiArIHQgKyBcIilcIik7XG4gICAgICAgICAgICBncm93LmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsIFwiYmFja2dyb3VuZFwiKVxuICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGxhYmVsX2hlaWdodCArIDIqc2V0dGluZ3MoXCJ0aWNrX3BhZGRpbmdcIikpXG4gICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGgpO1xuICAgICAgICAgICAgZ3Jvdy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgICAgICAgICAuYXR0cihcInhcIiwgMCkuYXR0cihcInlcIiwgaC8yKVxuICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg5MCBcIiArIFxuICAgICAgICAgICAgICAgIChsYWJlbF9oZWlnaHQgLSBzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSkgKyBcIiBcIiArIGgvMiArIFwiKVwiKVxuICAgICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLmF0dHIoXCJkeVwiLCBcIjAuMzVlbVwiKVxuICAgICAgICAgICAgICAudGV4dChyb3d0aWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZHJhdyBjb2x1bW4gbGFiZWxzXG4gICAgICAgICAgaWYgKGogPT09IDAgJiYgYXhlcy5jb2x1bW4udmFyaWFibGUoKSkge1xuICAgICAgICAgICAgdmFyIGNvbHVtbnRpY2sgPSBheGVzLmNvbHVtbi50aWNrcygpW2ldO1xuICAgICAgICAgICAgdmFyIGNvbHRpY2toID0gbGFiZWxfaGVpZ2h0ICsgMipzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKTtcbiAgICAgICAgICAgIHZhciBnY29sdW1uID0gZy5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcImF4aXMgYXhpcy1jb2x1bW5cIilcbiAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBsICsgXCIsXCIgKyAodCAtIGNvbHRpY2toKSArIFwiKVwiKTtcbiAgICAgICAgICAgIGdjb2x1bW4uYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgdylcbiAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgbGFiZWxfaGVpZ2h0ICsgMipzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSk7XG4gICAgICAgICAgICBnY29sdW1uLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwidGlja2xhYmVsXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwieFwiLCB3LzIpLmF0dHIoXCJ5XCIsIHNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKVxuICAgICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLmF0dHIoXCJkeVwiLCBcIjAuNzFlbVwiKVxuICAgICAgICAgICAgICAudGV4dChjb2x1bW50aWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZHJhdyBib3ggZm9yIGdyYXBoXG4gICAgICAgICAgdmFyIGdyID0gZy5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcIm1hcFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBsICsgXCIsXCIgKyB0ICsgXCIpXCIpO1xuICAgICAgICAgIGdyLmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsIFwiYmFja2dyb3VuZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3KS5hdHRyKFwiaGVpZ2h0XCIsIGgpO1xuICAgICAgICAgIC8vIGRyYXcgbWFwXG4gICAgICAgICAgZ3Iuc2VsZWN0QWxsKFwicGF0aFwiKS5kYXRhKGRqW2pdLnZhbHVlcykuZW50ZXIoKS5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgYXhlcy5yZWdpb24uc2NhbGUpLmF0dHIoXCJjbGFzc1wiLCBheGVzLmNvbG91ci5zY2FsZSk7XG4gICAgICAgICAgLy8gbmV4dCBsaW5lXG4gICAgICAgICAgdCArPSBoICsgc2V0dGluZ3MoXCJzZXBcIiwgXCJtYXBcIik7XG4gICAgICAgIH1cbiAgICAgICAgbCArPSB3ICsgc2V0dGluZ3MoXCJzZXBcIiwgXCJtYXBcIik7XG4gICAgICB9XG4gICAgICAvLyBhZGQgZXZlbnRzIHRvIHRoZSBsaW5lc1xuICAgICAgZy5zZWxlY3RBbGwoXCJwYXRoXCIpLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IGRbYXhlcy5yZWdpb24udmFyaWFibGUoKV07XG4gICAgICAgIGRpc3BhdGNoLm1vdXNlb3Zlci5jYWxsKGcsIGF4ZXMucmVnaW9uLnZhcmlhYmxlKCksIHJlZ2lvbiwgZCk7XG4gICAgICB9KS5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IGRbYXhlcy5yZWdpb24udmFyaWFibGUoKV07XG4gICAgICAgIGRpc3BhdGNoLm1vdXNlb3V0LmNhbGwoZywgYXhlcy5yZWdpb24udmFyaWFibGUoKSwgcmVnaW9uLCBkKTtcbiAgICAgIH0pLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICB2YXIgcmVnaW9uID0gZFtheGVzLnJlZ2lvbi52YXJpYWJsZSgpXTtcbiAgICAgICAgZGlzcGF0Y2guY2xpY2suY2FsbChnLCBheGVzLnJlZ2lvbi52YXJpYWJsZSgpLCByZWdpb24sIGQpO1xuICAgICAgfSk7XG4gICAgICAvLyBmaW5pc2hlZCBkcmF3aW5nIGNhbGwgcmVhZHkgZXZlbnRcbiAgICAgIGRpc3BhdGNoLnJlYWR5LmNhbGwoZyk7XG4gICAgfSk7XG4gIH0pO1xuXG5cbiAgLy8gTG9jYWwgZXZlbnQgaGFuZGxlcnNcbiAgZGlzcGF0Y2gub24oXCJtb3VzZW92ZXIuZ3JhcGhcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCJwYXRoXCIpLmNsYXNzZWQoXCJjb2xvdXJsb3dcIiwgdHJ1ZSk7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCJwYXRoXCIpLmZpbHRlcihmdW5jdGlvbihkLCBpKSB7XG4gICAgICByZXR1cm4gZFt2YXJpYWJsZV0gPT0gdmFsdWU7XG4gICAgfSkuY2xhc3NlZCh7XCJjb2xvdXJoaWdoXCI6IHRydWUsIFwiY29sb3VybG93XCI6IGZhbHNlfSk7XG4gIH0pO1xuICBkaXNwYXRjaC5vbihcIm1vdXNlb3V0LmdyYXBoXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgIHRoaXMuc2VsZWN0QWxsKFwicGF0aFwiKS5jbGFzc2VkKHtcImNvbG91cmhpZ2hcIjogZmFsc2UsIFwiY29sb3VybG93XCI6IGZhbHNlfSk7XG4gIH0pO1xuICBcbiAgLy8gdG9vbHRpcFxuICBpZiAoZDMudGlwICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgdGlwID0gZDMudGlwKCkuZGlyZWN0aW9uKFwic2VcIikuYXR0cignY2xhc3MnLCAndGlwIHRpcC1tYXAnKS5odG1sKGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkgeyBcbiAgICAgIHZhciBzY2hlbWEgPSBncmFwaC5zY2hlbWEoKTtcbiAgICAgIHZhciBmb3JtYXQgPSB2YWx1ZV9mb3JtYXR0ZXIoc2NoZW1hKTtcbiAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgIGZvciAodmFyIGkgaW4gc2NoZW1hLmZpZWxkcykge1xuICAgICAgICB2YXIgZmllbGQgPSBzY2hlbWEuZmllbGRzW2ldO1xuICAgICAgICBzdHIgKz0gZmllbGQudGl0bGUgKyAnOiAnICsgZm9ybWF0KGQsIGZpZWxkLm5hbWUpICsgJzwvYnI+JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdHI7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJyZWFkeS50aXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNhbGwodGlwKTtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcIm1vdXNlb3Zlci50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuc2hvdyh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwibW91c2VvdXQudGlwXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgICAgdGlwLmhpZGUodmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBncmFwaDtcbn1cblxuIiwiXG5mdW5jdGlvbiBncnBoX2xhYmVsX3NpemUoZykge1xuXG4gIC8vIGEgc3ZnIG9yIGcgZWxlbWVudCB0byB3aGljaCAgd2Ugd2lsbCBiZSBhZGRpbmcgb3VyIGxhYmVsIGluIG9yZGVyIHRvXG4gIC8vIHJlcXVlc3QgaXQncyBzaXplXG4gIHZhciBnXyA9IGc7XG4gIHZhciBmb3JtYXRfID0gZnVuY3Rpb24oeCl7cmV0dXJuIHg7fTtcbiAgLy8gc3RvcmUgcHJldmlvdXNseSBjYWxjdWxhdGVkIHZhbHVlczsgYXMgdGhlIHNpemUgb2YgY2VydGFpbiBsYWJlbHMgYXJlIFxuICAvLyByZXF1ZXN0ZWQgYWdhaW4gYW5kIGFnYWluIHRoaXMgZ3JlYXRseSBlbmhhbmNlcyBwZXJmb3JtYW5jZVxuICB2YXIgc2l6ZXNfID0ge307XG5cbiAgZnVuY3Rpb24gbGFiZWxfc2l6ZShsYWJlbCkge1xuICAgIGlmIChzaXplc19bbGFiZWxdKSB7XG4gICAgICByZXR1cm4gc2l6ZXNfW2xhYmVsXTtcbiAgICB9XG4gICAgaWYgKCFnXykgcmV0dXJuIFt1bmRlZmluZWQsIHVuZGVmaW5lZF07XG4gICAgdmFyIHRleHQgPSBnXy5hcHBlbmQoXCJ0ZXh0XCIpLnRleHQoZm9ybWF0XyhsYWJlbCkpO1xuICAgIHZhciBiYm94ID0gdGV4dFswXVswXS5nZXRCQm94KCk7XG4gICAgdmFyIHNpemUgPSBbYmJveC53aWR0aCoxLjIsIGJib3guaGVpZ2h0KjAuNjVdOyAvLyBUT0RPIHdoeTsgYW5kIGlzIHRoaXMgYWx3YXlzIGNvcnJlY3RcbiAgICAvL3ZhciBzaXplID0gaG9yaXpvbnRhbF8gPyB0ZXh0WzBdWzBdLmdldENvbXB1dGVkVGV4dExlbmd0aCgpIDpcbiAgICAgIC8vdGV4dFswXVswXS5nZXRCQm94KCkuaGVpZ2h0O1xuICAgIHRleHQucmVtb3ZlKCk7XG4gICAgc2l6ZXNfW2xhYmVsXSA9IHNpemU7XG4gICAgcmV0dXJuIHNpemU7XG4gIH1cblxuICBsYWJlbF9zaXplLnN2ZyA9IGZ1bmN0aW9uKGcpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGdfO1xuICAgIH0gZWxzZSB7XG4gICAgICBnXyA9IGc7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgbGFiZWxfc2l6ZS53aWR0aCA9IGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgdmFyIHNpemUgPSBsYWJlbF9zaXplKGxhYmVsKTtcbiAgICByZXR1cm4gc2l6ZVswXTtcbiAgfTtcblxuICBsYWJlbF9zaXplLmhlaWdodCA9IGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgdmFyIHNpemUgPSBsYWJlbF9zaXplKGxhYmVsKTtcbiAgICByZXR1cm4gc2l6ZVsxXTtcbiAgfTtcblxuICBsYWJlbF9zaXplLmZvcm1hdCA9IGZ1bmN0aW9uKGZvcm1hdCl7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApe1xuICAgICAgcmV0dXJuIGZvcm1hdF87XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcm1hdF8gPSBmb3JtYXQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHJldHVybiBsYWJlbF9zaXplO1xufVxuXG4iLCJcbmZ1bmN0aW9uIGdycGhfc2NhbGVfY2F0ZWdvcmljYWwoKSB7XG5cbiAgdmFyIGRvbWFpbjtcbiAgdmFyIHJhbmdlID0gWzAsIDFdO1xuXG4gIGZ1bmN0aW9uIHNjYWxlKHYpIHtcbiAgICB2YXIgaSA9IGRvbWFpbi5pbmRleE9mKHYpO1xuICAgIGlmIChpIDwgMCkgcmV0dXJuIHtsOiB1bmRlZmluZWQsIG06dW5kZWZpbmVkLCB1OnVuZGVmaW5lZH07XG4gICAgdmFyIGJ3ID0gKHJhbmdlWzFdIC0gcmFuZ2VbMF0pIC8gZG9tYWluLmxlbmd0aDtcbiAgICB2YXIgbSA9IGJ3KihpICsgMC41KTtcbiAgICB2YXIgdyA9IGJ3KigxIC0gc2V0dGluZ3MoXCJiYXJfcGFkZGluZ1wiKSkqMC41O1xuICAgIHJldHVybiB7bDptLXcsIG06bSwgdTptK3d9O1xuICB9XG5cbiAgc2NhbGUubCA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gc2NhbGUodikubDtcbiAgfTtcblxuICBzY2FsZS5tID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiBzY2FsZSh2KS5tO1xuICB9O1xuXG4gIHNjYWxlLnUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHNjYWxlKHYpLnU7XG4gIH07XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZG9tYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb21haW4gPSBkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24ocikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gcmFuZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJhbmdlID0gcjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkb21haW47XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5pZiAoZ3JwaC5zY2FsZSA9PT0gdW5kZWZpbmVkKSBncnBoLnNjYWxlID0ge307XG5ncnBoLnNjYWxlLmNhdGVnb3JpY2FsID0gZ3JwaF9zY2FsZV9jYXRlZ29yaWNhbDtcblxuIiwiXG5mdW5jdGlvbiBncnBoX3NjYWxlX2NobG9yb3BsZXRoKCkge1xuXG4gIHZhciBkb21haW47XG4gIHZhciBiYXNlY2xhc3MgPSBcImNobG9yb1wiO1xuICB2YXIgbmNvbG91cnMgID0gOTtcblxuICBmdW5jdGlvbiBzY2FsZSh2KSB7XG4gICAgaWYgKGRvbWFpbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBhc3N1bWUgd2UgaGF2ZSBvbmx5IDEgY29sb3VyXG4gICAgICByZXR1cm4gYmFzZWNsYXNzICsgXCIgXCIgKyBiYXNlY2xhc3MgKyBcIm4xXCIgKyBcIiBcIiArIGJhc2VjbGFzcyArIDE7XG4gICAgfVxuICAgIHZhciByYW5nZSAgPSBkb21haW5bMV0gLSBkb21haW5bMF07XG4gICAgdmFyIHZhbCAgICA9IE1hdGguc3FydCgodiAtIGRvbWFpblswXSkqMC45OTk5KSAvIE1hdGguc3FydChyYW5nZSk7XG4gICAgdmFyIGNhdCAgICA9IE1hdGguZmxvb3IodmFsKm5jb2xvdXJzKTtcbiAgICAvLyByZXR1cm5zIHNvbWV0aGluZyBsaWtlIFwiY2hsb3JvIGNobG9yb24xMCBjaGxvcm80XCJcbiAgICByZXR1cm4gYmFzZWNsYXNzICsgXCIgXCIgKyBiYXNlY2xhc3MgKyBcIm5cIiArIG5jb2xvdXJzICsgXCIgXCIgKyBiYXNlY2xhc3MgKyAoY2F0KzEpO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZG9tYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb21haW4gPSBkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24ocikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYmFzZWNsYXNzO1xuICAgIH0gZWxzZSB7XG4gICAgICBiYXNlY2xhc3MgPSByO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0ZXAgPSAoZG9tYWluWzFdIC0gZG9tYWluWzBdKS9uY29sb3VycztcbiAgICB2YXIgdCA9IGRvbWFpblswXTtcbiAgICB2YXIgdGlja3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBuY29sb3VyczsgKytpKSB7XG4gICAgICB0aWNrcy5wdXNoKHQpO1xuICAgICAgdCArPSBzdGVwO1xuICAgIH1cbiAgICByZXR1cm4gdGlja3M7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5pZiAoZ3JwaC5zY2FsZSA9PT0gdW5kZWZpbmVkKSBncnBoLnNjYWxlID0ge307XG5ncnBoLnNjYWxlLmNobG9yb3BsZXRoID0gZ3JwaF9zY2FsZV9jaGxvcm9wbGV0aCgpO1xuXG4iLCJcbmZ1bmN0aW9uIGdycGhfc2NhbGVfY29sb3VyKCkge1xuXG4gIHZhciBkb21haW47XG4gIHZhciByYW5nZSA9IFwiY29sb3VyXCI7XG4gIHZhciBuY29sb3VycztcblxuICBmdW5jdGlvbiBzY2FsZSh2KSB7XG4gICAgaWYgKGRvbWFpbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBhc3N1bWUgd2UgaGF2ZSBvbmx5IDEgY29sb3VyXG4gICAgICByZXR1cm4gcmFuZ2UgKyBcIiBcIiArIHJhbmdlICsgXCJuMVwiICsgXCIgXCIgKyByYW5nZSArIDE7XG4gICAgfVxuICAgIHZhciBpID0gZG9tYWluLmluZGV4T2Yodik7XG4gICAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZSBcImNvbG91ciBjb2xvdXJuMTAgY29sb3VyNFwiXG4gICAgcmV0dXJuIHJhbmdlICsgXCIgXCIgKyByYW5nZSArIFwiblwiICsgbmNvbG91cnMgKyBcIiBcIiArIHJhbmdlICsgKGkrMSk7XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihkKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBkb21haW47XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvbWFpbiA9IGQ7XG4gICAgICBuY29sb3VycyA9IGQgPyBkLmxlbmd0aDogdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24ocikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gcmFuZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJhbmdlID0gcjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkb21haW47XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5pZiAoZ3JwaC5zY2FsZSA9PT0gdW5kZWZpbmVkKSBncnBoLnNjYWxlID0ge307XG5ncnBoLnNjYWxlLmNvbG91ciA9IGdycGhfc2NhbGVfY29sb3VyKCk7XG4iLCJcbmZ1bmN0aW9uIGdycGhfc2NhbGVfbGluZWFyKCkge1xuXG4gIHZhciBsc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKTtcbiAgdmFyIGxhYmVsX3NpemVfID0gMjA7XG4gIHZhciBwYWRkaW5nXyA9IDU7XG4gIHZhciBudGlja3NfID0gMTA7XG4gIHZhciB0aWNrc187XG4gIHZhciBuZGVjXztcbiAgdmFyIGluc2lkZV8gPSB0cnVlO1xuXG4gIGZ1bmN0aW9uIHNjYWxlKHYpIHtcbiAgICByZXR1cm4gbHNjYWxlKHYpO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gbHNjYWxlLmRvbWFpbigpO1xuICAgIGQgPSBsc2NhbGUuZG9tYWluKGQpO1xuICAgIG5kZWNfID0gdW5kZWZpbmVkO1xuICAgIHRpY2tzXyA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKHIpIHtcbiAgICByID0gbHNjYWxlLnJhbmdlKHIpO1xuICAgIG5kZWNfID0gdW5kZWZpbmVkO1xuICAgIHRpY2tzXyA9IHVuZGVmaW5lZDtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS5sYWJlbF9zaXplID0gZnVuY3Rpb24obGFiZWxfc2l6ZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbGFiZWxfc2l6ZV87XG4gICAgfSBlbHNlIHtcbiAgICAgIGxhYmVsX3NpemVfID0gbGFiZWxfc2l6ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBsc2l6ZShsYWJlbCkge1xuICAgIHZhciBzaXplID0gdHlwZW9mKGxhYmVsX3NpemVfKSA9PSBcImZ1bmN0aW9uXCIgPyBsYWJlbF9zaXplXyhsYWJlbCkgOiBsYWJlbF9zaXplXztcbiAgICBzaXplICs9IHBhZGRpbmdfO1xuICAgIHJldHVybiBzaXplO1xuICB9XG5cbiAgc2NhbGUubnRpY2tzID0gZnVuY3Rpb24obikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnRpY2tzXztcbiAgICB9IGVsc2Uge1xuICAgICAgbnRpY2tzXyA9IG47XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUuaW5zaWRlID0gZnVuY3Rpb24oaSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gaW5zaWRlXztcbiAgICB9IGVsc2Uge1xuICAgICAgaW5zaWRlXyA9IGkgPyB0cnVlIDogZmFsc2U7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUubmljZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByID0gbHNjYWxlLnJhbmdlKCk7XG4gICAgdmFyIGQgPSBsc2NhbGUuZG9tYWluKCk7XG4gICAgdmFyIGwgPSBNYXRoLmFicyhyWzFdIC0gclswXSk7XG4gICAgdmFyIHcgPSB3aWxraW5zb25faWkoZFswXSwgZFsxXSwgbnRpY2tzXywgbHNpemUsIGwpO1xuICAgIGlmIChpbnNpZGVfKSB7XG4gICAgICB2YXIgdzEgPSBsc2l6ZSh3LmxhYmVsc1swXSk7XG4gICAgICB2YXIgdzIgPSBsc2l6ZSh3LmxhYmVsc1t3LmxhYmVscy5sZW5ndGgtMV0pO1xuICAgICAgdmFyIHBhZCA9IHcxLzIgKyB3Mi8yO1xuICAgICAgdyA9IHdpbGtpbnNvbl9paShkWzBdLCBkWzFdLCBudGlja3NfLCBsc2l6ZSwgbC1wYWQpO1xuICAgICAgaWYgKHJbMF0gPCByWzFdKSB7XG4gICAgICAgIGxzY2FsZS5yYW5nZShbclswXSt3MS8yLCByWzFdLXcyLzJdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxzY2FsZS5yYW5nZShbclswXS13MS8yLCByWzFdK3cyLzJdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZG9tYWluID0gW3cubG1pbiwgdy5sbWF4XTtcbiAgICBsc2NhbGUuZG9tYWluKFt3LmxtaW4sIHcubG1heF0pO1xuICAgIHRpY2tzXyA9IHcubGFiZWxzO1xuICAgIG5kZWNfID0gdy5uZGVjO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRpY2tzXyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbHNjYWxlLnRpY2tzKG50aWNrc18pO1xuICAgIHJldHVybiB0aWNrc187XG4gICAgLy9yZXR1cm4gdGlja3NfLm1hcChmdW5jdGlvbih0KSB7IHJldHVybiBmb3JtYXRfbnVtYmVyKHQsIFwiXCIsIG5kZWNfKTt9KTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmlmIChncnBoLnNjYWxlID09PSB1bmRlZmluZWQpIGdycGguc2NhbGUgPSB7fTtcbmdycGguc2NhbGUubGluZWFyID0gZ3JwaF9zY2FsZV9saW5lYXIoKTtcblxuIiwiZnVuY3Rpb24gZ3JwaF9zY2FsZV9wZXJpb2QoKSB7XG5cbiAgdmFyIHRpbWVfc2NhbGUgPSBkMy50aW1lLnNjYWxlKCk7XG4gIHZhciB5ZWFyc187XG4gIHZhciBoYXNfbW9udGhfID0gZmFsc2U7XG4gIHZhciBoYXNfcXVhcnRlcl8gPSBmYWxzZTtcblxuICBmdW5jdGlvbiBzY2FsZSh2YWwpIHtcbiAgICBpZiAoKHZhbCBpbnN0YW5jZW9mIERhdGUpIHx8IG1vbWVudC5pc01vbWVudCh2YWwpKSB7XG4gICAgICByZXR1cm4gdGltZV9zY2FsZSh2YWwpO1xuICAgIH0gZWxzZSBpZiAodmFsICYmIHZhbC5kYXRlICYmIHZhbC5wZXJpb2QpIHtcbiAgICAgIHRpbWVfc2NhbGUodmFsLmRhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWwgPSBcIlwiICsgdmFsO1xuICAgICAgcmV0dXJuIHRpbWVfc2NhbGUoZGF0ZV9wZXJpb2QodmFsKS5kYXRlKTtcbiAgICB9XG4gIH1cblxuICBzY2FsZS5oYXNfbW9udGggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaGFzX21vbnRoXztcbiAgfTtcblxuICBzY2FsZS5oYXNfcXVhcnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBoYXNfcXVhcnRlcl87XG4gIH07XG5cbiAgZnVuY3Rpb24gZGV0ZXJtaW5lX2RvbWFpbihwZXJpb2RzKSB7XG4gICAgdmFyIG1pbiA9IGQzLm1pbihwZXJpb2RzLCBmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gZC5wZXJpb2Quc3RhcnQ7XG4gICAgfSk7XG4gICAgdmFyIG1heCA9IGQzLm1heChwZXJpb2RzLCBmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gZC5wZXJpb2QuZW5kO1xuICAgIH0pO1xuICAgIHZhciB5ZWFyX21pbiA9IG1pbi55ZWFyKCk7XG4gICAgLy8gbWF4LCBpcyBvZnRlbiAxc3Qgb2YgSmFudWFyeTsgcGVyaW9kIHJ1bnMgI3VudGlsIyAxc3Qgb2YgamFudXJ5XG4gICAgdmFyIHllYXJfbWF4ID0gKG1heC5zdWJ0cmFjdCgxLCBcInNlY29uZHNcIikpLnllYXIoKTtcbiAgICAvLyBmaXJzdCBhdHRlbXB0OiBwbG90IGNvbXBsZXRlIHllYXJzXG4gICAgdmFyIGRvbWFpbl9taW4gPSBuZXcgRGF0ZSh5ZWFyX21pbiArIFwiLTAxLTAxXCIpO1xuICAgIHZhciBkb21haW5fbWF4ID0gbmV3IERhdGUoKHllYXJfbWF4KzEpICsgXCItMDEtMDFcIik7XG4gICAgdmFyIGNvdmVyYWdlID0gKG1heCAtIG1pbikgLyAoZG9tYWluX21heCAtIGRvbWFpbl9taW4pO1xuICAgIGlmIChjb3ZlcmFnZSA+IHNldHRpbmdzKCdwZXJpb2RfY292ZXJhZ2UnKSkgcmV0dXJuIFtkb21haW5fbWluLCBkb21haW5fbWF4XTtcbiAgICAvLyBub3QgZW5vdWdoIGNvdmVyYWdlOyBkZXRlcm1pbmUgaWYgc3RhcnRpbmcgeWVhciBvciBsYXN0IHllYXIgaGFzIGxlYXN0XG4gICAgLy8gY292ZXJhZ2VcbiAgICB2YXIgeWVhcl9taW5fY292ZXJhZ2UgPSBuZXcgRGF0ZSgoeWVhcl9taW4rMSkgKyBcIi0wMS0wMVwiKSAtIG1pbjtcbiAgICB2YXIgeWVhcl9tYXhfY292ZXJhZ2UgPSBtYXggLSBuZXcgRGF0ZSh5ZWFyX21heCArIFwiLTAxLTAxXCIpO1xuICAgIGlmICh5ZWFyX21pbl9jb3ZlcmFnZSA+PSB5ZWFyX21heF9jb3ZlcmFnZSkge1xuICAgICAgZG9tYWluX21heCA9IG1heDtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9tYWluX21pbiA9IG1pbjtcbiAgICB9XG4gICAgY292ZXJhZ2UgPSAobWF4IC0gbWluKSAvIChkb21haW5fbWF4IC0gZG9tYWluX21pbik7XG4gICAgaWYgKGNvdmVyYWdlID4gc2V0dGluZ3MoJ3BlcmlvZF9jb3ZlcmFnZScpKSByZXR1cm4gW2RvbWFpbl9taW4sIGRvbWFpbl9tYXhdO1xuICAgIC8vIHN0aWxsIG5vdCBlbm91Z2ggY292ZXJhZ2U7IHNldCBkb21haW4gZXF1YWwgdG8gcmFuZ2VcbiAgICBkb21haW5fbWluID0gbWluO1xuICAgIGRvbWFpbl9tYXggPSBtYXg7XG4gICAgcmV0dXJuIFtkb21haW5fbWluLCBkb21haW5fbWF4XTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKGRvbWFpbikge1xuICAgIHZhciBwZXJpb2RzID0gZG9tYWluLm1hcChkYXRlX3BlcmlvZCk7XG4gICAgLy8gZGV0ZXJtaW5lIHdoaWNoIHllYXJzIGFyZSBpbiBkb21haW47XG4gICAgeWVhcnNfID0gZDMuZXh0ZW50KHBlcmlvZHMsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIHJldHVybiBkLnBlcmlvZC5zdGFydC55ZWFyKCk7XG4gICAgfSk7XG4gICAgLy8gc2V0IGRvbWFpblxuICAgIHRpbWVfc2NhbGUuZG9tYWluKGRldGVybWluZV9kb21haW4ocGVyaW9kcykpO1xuICAgIC8vIGRldGVybWluZSB3aGljaCBzdWJ1bml0cyBvZiB5ZWFycyBzaG91bGQgYmUgZHJhd25cbiAgICBoYXNfbW9udGhfID0gcGVyaW9kcy5yZWR1Y2UoZnVuY3Rpb24ocCwgZCkge1xuICAgICAgcmV0dXJuIHAgfHwgZC50eXBlID09IFwibW9udGhcIjtcbiAgICB9LCBmYWxzZSk7XG4gICAgaGFzX3F1YXJ0ZXJfID0gcGVyaW9kcy5yZWR1Y2UoZnVuY3Rpb24ocCwgZCkge1xuICAgICAgcmV0dXJuIHAgfHwgZC50eXBlID09IFwicXVhcnRlclwiO1xuICAgIH0sIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB0aW1lX3NjYWxlLnJhbmdlKCk7XG4gICAgdGltZV9zY2FsZS5yYW5nZShyYW5nZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICBmdW5jdGlvbiBpc19pbnNpZGVfZG9tYWluKHBlcmlvZCwgZG9tYWluKSB7XG4gICAgICByZXR1cm4gKHBlcmlvZC5wZXJpb2Quc3RhcnQgPj0gZG9tYWluWzBdKSAmJlxuICAgICAgICAocGVyaW9kLnBlcmlvZC5lbmQgPD0gZG9tYWluWzFdKTtcbiAgICB9XG5cbiAgICB2YXIgdGlja3MgPSBbXTtcbiAgICBmb3IgKHZhciB5ZWFyID0geWVhcnNfWzBdOyB5ZWFyIDw9IHllYXJzX1sxXTsgeWVhcisrKSB7XG4gICAgICB2YXIgdGljayA9IGRhdGVfcGVyaW9kKHllYXIgKyBcIi0wMS0wMS9QMVlcIik7XG4gICAgICB0aWNrLmxhc3QgPSB5ZWFyID09IHllYXJzX1sxXTtcbiAgICAgIHRpY2subGFiZWwgPSB5ZWFyO1xuICAgICAgaWYgKGlzX2luc2lkZV9kb21haW4odGljaywgdGltZV9zY2FsZS5kb21haW4oKSkpIHRpY2tzLnB1c2godGljayk7XG5cbiAgICAgIGlmIChzY2FsZS5oYXNfcXVhcnRlcigpKSB7XG4gICAgICAgIGZvciAodmFyIHEgPSAwOyBxIDwgNDsgcSsrKSB7XG4gICAgICAgICAgdGljayA9IGRhdGVfcGVyaW9kKHllYXIgKyBcIi1cIiArIHplcm9fcGFkKHEqMysxLCAyKSArIFwiLTAxL1AzTVwiKTtcbiAgICAgICAgICB0aWNrLmxhc3QgPSBxID09IDM7XG4gICAgICAgICAgdGljay5sYWJlbCA9IHErMTtcbiAgICAgICAgICBpZiAoaXNfaW5zaWRlX2RvbWFpbih0aWNrLCB0aW1lX3NjYWxlLmRvbWFpbigpKSlcbiAgICAgICAgICAgIHRpY2tzLnB1c2godGljayk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzY2FsZS5oYXNfbW9udGgoKSkge1xuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IDEyOyBtKyspIHtcbiAgICAgICAgICB0aWNrID0gZGF0ZV9wZXJpb2QoeWVhciArIFwiLVwiICsgemVyb19wYWQobSsxLDIpICsgXCItMDEvUDFNXCIpO1xuICAgICAgICAgIHRpY2subGFzdCA9IChzY2FsZS5oYXNfcXVhcnRlcigpICYmICgobSsxKSAlIDMpID09PSAwKSB8fCBtID09IDExO1xuICAgICAgICAgIHRpY2subGFiZWwgPSBtKzE7XG4gICAgICAgICAgaWYgKGlzX2luc2lkZV9kb21haW4odGljaywgdGltZV9zY2FsZS5kb21haW4oKSkpXG4gICAgICAgICAgICB0aWNrcy5wdXNoKHRpY2spO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aWNrcztcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cblxuaWYgKGdycGguc2NhbGUgPT09IHVuZGVmaW5lZCkgZ3JwaC5zY2FsZSA9IHt9O1xuZ3JwaC5zY2FsZS5wZXJpb2QgPSBncnBoX3NjYWxlX3BlcmlvZCgpO1xuIiwiXG5mdW5jdGlvbiBncnBoX3NjYWxlX3NpemUoKSB7XG4gIFxuICB2YXIgbWF4O1xuICB2YXIgZG9tYWluO1xuXG4gIGZ1bmN0aW9uIHNjYWxlKHYpIHtcbiAgICBpZiAoZG9tYWluID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzZXR0aW5ncyhcImRlZmF1bHRfYnViYmxlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbSA9IG1heCA9PT0gdW5kZWZpbmVkID8gc2V0dGluZ3MoXCJtYXhfYnViYmxlXCIpIDogbWF4O1xuICAgICAgcmV0dXJuIG0gKiBNYXRoLnNxcnQodikvTWF0aC5zcXJ0KGRvbWFpblsxXSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZG9tYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb21haW4gPSBkMy5leHRlbnQoZCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBtYXggPT09IHVuZGVmaW5lZCA/IHNldHRpbmdzKFwibWF4X2J1YmJsZVwiKSA6IG1heDtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF4ID0gZDMubWF4KHIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmlmIChncnBoLnNjYWxlID09PSB1bmRlZmluZWQpIGdycGguc2NhbGUgPSB7fTtcbmdycGguc2NhbGUuc2l6ZSA9IGdycGhfc2NhbGVfc2l6ZSgpO1xuXG4iLCJcblxudmFyIHNldHRpbmdzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzID0ge1xuICAgICdkZWZhdWx0JyA6IHtcbiAgICAgICdwYWRkaW5nJyA6IFsyLCAyLCAyLCAyXSxcbiAgICAgICdsYWJlbF9wYWRkaW5nJyA6IDQsXG4gICAgICAnc2VwJyA6IDgsXG4gICAgICAncG9pbnRfc2l6ZScgOiAzLFxuICAgICAgJ21heF9idWJibGUnIDogMjAsXG4gICAgICAnZGVmYXVsdF9idWJibGUnIDogNSxcbiAgICAgICdiYXJfcGFkZGluZycgOiAwLjQsXG4gICAgICAndGlja19sZW5ndGgnIDogNSxcbiAgICAgICd0aWNrX3BhZGRpbmcnIDogMixcbiAgICAgICdwZXJpb2RfY292ZXJhZ2UnIDogMC44NVxuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBnZXQoc2V0dGluZywgdHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICBpZiAoc1t0eXBlXSAhPT0gdW5kZWZpbmVkICYmIHNbdHlwZV1bc2V0dGluZ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gc1t0eXBlXVtzZXR0aW5nXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzLmRlZmF1bHRbc2V0dGluZ107XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzLmRlZmF1bHRbc2V0dGluZ107XG4gICAgfVxuICB9XG5cbiAgZ2V0LnNldCA9IGZ1bmN0aW9uKHNldHRpbmcsIGEsIGIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcy5kZWZhdWx0W3NldHRpbmddID0gYTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgaWYgKHNbYV0gPT09IHVuZGVmaW5lZCkgc1thXSA9IHt9O1xuICAgICAgc1thXVtzZXR0aW5nXSA9IGI7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTmVlZCBhdCBsZWF0IHR3byBhcmd1bWVudHMuXCIpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZ2V0O1xufSgpO1xuXG5ncnBoLnNldHRpbmdzID0gc2V0dGluZ3M7XG4iLCJcbi8vIENvbnZlcnQgYSBudW1iZXIgdG8gc3RyaW5nIHBhZGRpbmcgaXQgd2l0aCB6ZXJvcyB1bnRpbCB0aGUgbnVtYmVyIG9mIFxuLy8gY2hhcmFjdGVycyBiZWZvcmUgdGhlIGRlY2ltYWwgc3ltYm9sIGVxdWFscyBsZW5ndGggKG5vdCBpbmNsdWRpbmcgc2lnbilcbmZ1bmN0aW9uIHplcm9fcGFkKG51bSwgbGVuZ3RoKSB7XG4gIHZhciBuID0gTWF0aC5hYnMobnVtKTtcbiAgdmFyIG56ZXJvcyA9IE1hdGgubWF4KDAsIGxlbmd0aCAtIE1hdGguZmxvb3IobikudG9TdHJpbmcoKS5sZW5ndGggKTtcbiAgdmFyIHBhZGRpbmcgPSBNYXRoLnBvdygxMCwgbnplcm9zKS50b1N0cmluZygpLnN1YnN0cigxKTtcbiAgaWYoIG51bSA8IDAgKSB7XG4gICAgcGFkZGluZyA9ICctJyArIHBhZGRpbmc7XG4gIH1cbiAgcmV0dXJuIHBhZGRpbmcgKyBuO1xufVxuXG5cbi8vIEZvcm1hdCBhIG51bWVyaWMgdmFsdWU6XG4vLyAtIE1ha2Ugc3VyZSBpdCBpcyByb3VuZGVkIHRvIHRoZSBjb3JyZWN0IG51bWJlciBvZiBkZWNpbWFscyAobmRlYylcbi8vIC0gVXNlIHRoZSBjb3JyZWN0IGRlY2ltYWwgc2VwYXJhdG9yIChkZWMpXG4vLyAtIEFkZCBhIHRob3VzYW5kcyBzZXBhcmF0b3IgKGdycClcbmZ1bmN0aW9uIGZvcm1hdF9udW1iZXIobGFiZWwsIHVuaXQsIG5kZWMsIGRlYywgZ3JwKSB7XG4gIGlmIChpc05hTihsYWJlbCkpIHJldHVybiAnJztcbiAgdW5pdCA9IHVuaXQgfHwgJyc7XG4gIGRlYyA9IGRlYyB8fCAnLic7XG4gIGdycCA9IGdycCB8fCAnICc7XG4gIC8vIHJvdW5kIG51bWJlclxuICBpZiAobmRlYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGFiZWwgPSBsYWJlbC50b0ZpeGVkKG5kZWMpO1xuICB9IGVsc2Uge1xuICAgIGxhYmVsID0gbGFiZWwudG9TdHJpbmcoKTtcbiAgfVxuICAvLyBGb2xsb3dpbmcgYmFzZWQgb24gY29kZSBmcm9tIFxuICAvLyBodHRwOi8vd3d3Lm1yZWRrai5jb20vamF2YXNjcmlwdC9udW1iZXJGb3JtYXQuaHRtbFxuICB4ICAgICA9IGxhYmVsLnNwbGl0KCcuJyk7XG4gIHgxICAgID0geFswXTtcbiAgeDIgICAgPSB4Lmxlbmd0aCA+IDEgPyBkZWMgKyB4WzFdIDogJyc7XG4gIGlmIChncnAgIT09ICcnKSB7XG4gICAgdmFyIHJneCA9IC8oXFxkKykoXFxkezN9KS87XG4gICAgd2hpbGUgKHJneC50ZXN0KHgxKSkge1xuICAgICAgeDEgPSB4MS5yZXBsYWNlKHJneCwgJyQxJyArIGdycCArICckMicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4oeDEgKyB4MiArIHVuaXQpO1xufVxuXG5cblxuIiwiXG4vLyBGb3JtYXQgYSBudW1lcmljIHZhbHVlOlxuLy8gLSBNYWtlIHN1cmUgaXQgaXMgcm91bmRlZCB0byB0aGUgY29ycmVjdCBudW1iZXIgb2YgZGVjaW1hbHMgKG5kZWMpXG4vLyAtIFVzZSB0aGUgY29ycmVjdCBkZWNpbWFsIHNlcGFyYXRvciAoZGVjKVxuLy8gLSBBZGQgYSB0aG91c2FuZHMgc2VwYXJhdG9yIChncnApXG5mb3JtYXRfbnVtZXJpYyA9IGZ1bmN0aW9uKGxhYmVsLCB1bml0LCBuZGVjLCBkZWMsIGdycCkge1xuICBpZiAoaXNOYU4obGFiZWwpKSByZXR1cm4gJyc7XG4gIGlmICh1bml0ID09PSB1bmRlZmluZWQpIHVuaXQgPSAnJztcbiAgaWYgKGRlYyA9PT0gdW5kZWZpbmVkKSBkZWMgPSAnLCc7XG4gIGlmIChncnAgPT09IHVuZGVmaW5lZCkgZ3JwID0gJyAnO1xuICAvLyByb3VuZCBudW1iZXJcbiAgaWYgKG5kZWMgIT09IHVuZGVmaW5lZCkge1xuICAgIGxhYmVsID0gbGFiZWwudG9GaXhlZChuZGVjKTtcbiAgfSBlbHNlIHtcbiAgICBsYWJlbCA9IGxhYmVsLnRvU3RyaW5nKCk7XG4gIH1cbiAgLy8gRm9sbG93aW5nIGJhc2VkIG9uIGNvZGUgZnJvbSBcbiAgLy8gaHR0cDovL3d3dy5tcmVka2ouY29tL2phdmFzY3JpcHQvbnVtYmVyRm9ybWF0Lmh0bWxcbiAgeCAgICAgPSBsYWJlbC5zcGxpdCgnLicpO1xuICB4MSAgICA9IHhbMF07XG4gIHgyICAgID0geC5sZW5ndGggPiAxID8gZGVjICsgeFsxXSA6ICcnO1xuICBpZiAoZ3JwICE9PSAnJykge1xuICAgIHZhciByZ3ggPSAvKFxcZCspKFxcZHszfSkvO1xuICAgIHdoaWxlIChyZ3gudGVzdCh4MSkpIHtcbiAgICAgIHgxID0geDEucmVwbGFjZShyZ3gsICckMScgKyBncnAgKyAnJDInKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuKHgxICsgeDIgKyB1bml0KTtcbn07XG5cblxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyA9PT09ICAgICAgICAgICAgICAgICAgICAgICAgIFdJTEtJTlNPTiBBTEdPUklUSE0gICAgICAgICAgICAgICAgICAgICAgICA9PT09XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblxuZnVuY3Rpb24gd2lsa2luc29uX2lpKGRtaW4sIGRtYXgsIG0sIGNhbGNfbGFiZWxfd2lkdGgsIGF4aXNfd2lkdGgsIG1taW4sIG1tYXgsIFEsIHByZWNpc2lvbiwgbWluY292ZXJhZ2UpIHtcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PSBTVUJST1VUSU5FUyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvLyBUaGUgZm9sbG93aW5nIHJvdXRpbmUgY2hlY2tzIGZvciBvdmVybGFwIGluIHRoZSBsYWJlbHMuIFRoaXMgaXMgdXNlZCBpbiB0aGUgXG4gIC8vIFdpbGtpbnNvbiBsYWJlbGluZyBhbGdvcml0aG0gYmVsb3cgdG8gZW5zdXJlIHRoYXQgdGhlIGxhYmVscyBkbyBub3Qgb3ZlcmxhcC5cbiAgZnVuY3Rpb24gb3ZlcmxhcChsbWluLCBsbWF4LCBsc3RlcCwgY2FsY19sYWJlbF93aWR0aCwgYXhpc193aWR0aCwgbmRlYykge1xuICAgIHZhciB3aWR0aF9tYXggPSBsc3RlcCpheGlzX3dpZHRoLyhsbWF4LWxtaW4pO1xuICAgIGZvciAodmFyIGwgPSBsbWluOyAobCAtIGxtYXgpIDw9IDFFLTEwOyBsICs9IGxzdGVwKSB7XG4gICAgICB2YXIgdyAgPSBjYWxjX2xhYmVsX3dpZHRoKGwsIG5kZWMpO1xuICAgICAgaWYgKHcgPiB3aWR0aF9tYXgpIHJldHVybih0cnVlKTtcbiAgICB9XG4gICAgcmV0dXJuKGZhbHNlKTtcbiAgfVxuXG4gIC8vIFBlcmZvcm0gb25lIGl0ZXJhdGlvbiBvZiB0aGUgV2lsa2luc29uIGFsZ29yaXRobVxuICBmdW5jdGlvbiB3aWxraW5zb25fc3RlcChtaW4sIG1heCwgaywgbSwgUSwgbWluY292ZXJhZ2UpIHtcbiAgICAvLyBkZWZhdWx0IHZhbHVlc1xuICAgIFEgICAgICAgICAgICAgICA9IFEgICAgICAgICB8fCBbMTAsIDEsIDUsIDIsIDIuNSwgMywgNCwgMS41LCA3LCA2LCA4LCA5XTtcbiAgICBwcmVjaXNpb24gICAgICAgPSBwcmVjaXNpb24gfHwgWzEsICAwLCAwLCAwLCAgLTEsIDAsIDAsICAtMSwgMCwgMCwgMCwgMF07XG4gICAgbWluY292ZXJhZ2UgICAgID0gbWluY292ZXJhZ2UgfHwgMC44O1xuICAgIG0gICAgICAgICAgICAgICA9IG0gfHwgaztcbiAgICAvLyBjYWxjdWxhdGUgc29tZSBzdGF0cyBuZWVkZWQgaW4gbG9vcFxuICAgIHZhciBpbnRlcnZhbHMgICA9IGsgLSAxO1xuICAgIHZhciBkZWx0YSAgICAgICA9IChtYXggLSBtaW4pIC8gaW50ZXJ2YWxzO1xuICAgIHZhciBiYXNlICAgICAgICA9IE1hdGguZmxvb3IoTWF0aC5sb2coZGVsdGEpL01hdGguTE4xMCk7XG4gICAgdmFyIGRiYXNlICAgICAgID0gTWF0aC5wb3coMTAsIGJhc2UpO1xuICAgIC8vIGNhbGN1bGF0ZSBncmFudWxhcml0eTsgb25lIG9mIHRoZSB0ZXJtcyBpbiBzY29yZVxuICAgIHZhciBncmFudWxhcml0eSA9IDEgLSBNYXRoLmFicyhrLW0pL207XG4gICAgLy8gaW5pdGlhbGlzZSBlbmQgcmVzdWx0XG4gICAgdmFyIGJlc3Q7XG4gICAgLy8gbG9vcCB0aHJvdWdoIGFsbCBwb3NzaWJsZSBsYWJlbCBwb3NpdGlvbnMgd2l0aCBnaXZlbiBrXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IFEubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIGNhbGN1bGF0ZSBsYWJlbCBwb3NpdGlvbnNcbiAgICAgIHZhciB0ZGVsdGEgPSBRW2ldICogZGJhc2U7XG4gICAgICB2YXIgdG1pbiAgID0gTWF0aC5mbG9vcihtaW4vdGRlbHRhKSAqIHRkZWx0YTtcbiAgICAgIHZhciB0bWF4ICAgPSB0bWluICsgaW50ZXJ2YWxzICogdGRlbHRhO1xuICAgICAgLy8gY2FsY3VsYXRlIHRoZSBudW1iZXIgb2YgZGVjaW1hbHNcbiAgICAgIHZhciBuZGVjICAgPSAoYmFzZSArIHByZWNpc2lvbltpXSkgPCAwID8gTWF0aC5hYnMoYmFzZSArIHByZWNpc2lvbltpXSkgOiAwO1xuICAgICAgLy8gaWYgbGFiZWwgcG9zaXRpb25zIGNvdmVyIHJhbmdlXG4gICAgICBpZiAodG1pbiA8PSBtaW4gJiYgdG1heCA+PSBtYXgpIHtcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJvdW5kbmVzcyBhbmQgY292ZXJhZ2UgcGFydCBvZiBzY29yZVxuICAgICAgICB2YXIgcm91bmRuZXNzID0gMSAtIChpIC0gKHRtaW4gPD0gMCAmJiB0bWF4ID49IDApKSAvIFEubGVuZ3RoO1xuICAgICAgICB2YXIgY292ZXJhZ2UgID0gKG1heC1taW4pLyh0bWF4LXRtaW4pO1xuICAgICAgICAvLyBpZiBjb3ZlcmFnZSBoaWdoIGVub3VnaFxuICAgICAgICBpZiAoY292ZXJhZ2UgPiBtaW5jb3ZlcmFnZSAmJiAhb3ZlcmxhcCh0bWluLCB0bWF4LCB0ZGVsdGEsIGNhbGNfbGFiZWxfd2lkdGgsIGF4aXNfd2lkdGgsIG5kZWMpKSB7XG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHNjb3JlXG4gICAgICAgICAgdmFyIHRuaWNlID0gZ3JhbnVsYXJpdHkgKyByb3VuZG5lc3MgKyBjb3ZlcmFnZTtcbiAgICAgICAgICAvLyBpZiBoaWdoZXN0IHNjb3JlXG4gICAgICAgICAgaWYgKChiZXN0ID09PSB1bmRlZmluZWQpIHx8ICh0bmljZSA+IGJlc3Quc2NvcmUpKSB7XG4gICAgICAgICAgICBiZXN0ID0ge1xuICAgICAgICAgICAgICAgICdsbWluJyAgOiB0bWluLFxuICAgICAgICAgICAgICAgICdsbWF4JyAgOiB0bWF4LFxuICAgICAgICAgICAgICAgICdsc3RlcCcgOiB0ZGVsdGEsXG4gICAgICAgICAgICAgICAgJ3Njb3JlJyA6IHRuaWNlLFxuICAgICAgICAgICAgICAgICduZGVjJyAgOiBuZGVjXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHJldHVyblxuICAgIHJldHVybiAoYmVzdCk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IE1BSU4gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBkZWZhdWx0IHZhbHVlc1xuICBkbWluICAgICAgICAgICAgID0gTnVtYmVyKGRtaW4pO1xuICBkbWF4ICAgICAgICAgICAgID0gTnVtYmVyKGRtYXgpO1xuICBpZiAoTWF0aC5hYnMoZG1pbiAtIGRtYXgpIDwgMUUtMTApIHtcbiAgICBkbWluID0gMC45NipkbWluO1xuICAgIGRtYXggPSAxLjA0KmRtYXg7XG4gIH1cbiAgY2FsY19sYWJlbF93aWR0aCA9IGNhbGNfbGFiZWxfd2lkdGggfHwgZnVuY3Rpb24oKSB7IHJldHVybigwKTt9O1xuICBheGlzX3dpZHRoICAgICAgID0gYXhpc193aWR0aCB8fCAxO1xuICBRICAgICAgICAgICAgICAgID0gUSAgICAgICAgIHx8IFsxMCwgMSwgNSwgMiwgMi41LCAzLCA0LCAxLjUsIDcsIDYsIDgsIDldO1xuICBwcmVjaXNpb24gICAgICAgID0gcHJlY2lzaW9uIHx8IFsxLCAgMCwgMCwgMCwgIC0xLCAwLCAwLCAgLTEsIDAsIDAsIDAsIDBdO1xuICBtaW5jb3ZlcmFnZSAgICAgID0gbWluY292ZXJhZ2UgfHwgMC44O1xuICBtbWluICAgICAgICAgICAgID0gbW1pbiB8fCAyO1xuICBtbWF4ICAgICAgICAgICAgID0gbW1heCB8fCBNYXRoLmNlaWwoNiptKTtcbiAgLy8gaW5pdGlsaXNlIGVuZCByZXN1bHRcbiAgdmFyIGJlc3QgPSB7XG4gICAgICAnbG1pbicgIDogZG1pbixcbiAgICAgICdsbWF4JyAgOiBkbWF4LFxuICAgICAgJ2xzdGVwJyA6IChkbWF4IC0gZG1pbiksXG4gICAgICAnc2NvcmUnIDogLTFFOCxcbiAgICAgICduZGVjJyAgOiAwXG4gICAgfTtcbiAgLy8gY2FsY3VsYXRlIG51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICB2YXIgeCA9IFN0cmluZyhiZXN0LmxzdGVwKS5zcGxpdCgnLicpO1xuICBiZXN0Lm5kZWMgPSB4Lmxlbmd0aCA+IDEgPyB4WzFdLmxlbmd0aCA6IDA7XG4gIC8vIGxvb3AgdGhvdWdoIGFsbCBwb3NzaWJsZSBudW1iZXJzIG9mIGxhYmVsc1xuICBmb3IgKHZhciBrID0gbW1pbjsgayA8PSBtbWF4OyBrKyspIHsgXG4gICAgLy8gY2FsY3VsYXRlIGJlc3QgbGFiZWwgcG9zaXRpb24gZm9yIGN1cnJlbnQgbnVtYmVyIG9mIGxhYmVsc1xuICAgIHZhciByZXN1bHQgPSB3aWxraW5zb25fc3RlcChkbWluLCBkbWF4LCBrLCBtLCBRLCBtaW5jb3ZlcmFnZSk7XG4gICAgLy8gY2hlY2sgaWYgY3VycmVudCByZXN1bHQgaGFzIGhpZ2hlciBzY29yZVxuICAgIGlmICgocmVzdWx0ICE9PSB1bmRlZmluZWQpICYmICgoYmVzdCA9PT0gdW5kZWZpbmVkKSB8fCAocmVzdWx0LnNjb3JlID4gYmVzdC5zY29yZSkpKSB7XG4gICAgICBiZXN0ID0gcmVzdWx0O1xuICAgIH1cbiAgfVxuICAvLyBnZW5lcmF0ZSBsYWJlbCBwb3NpdGlvbnNcbiAgdmFyIGxhYmVscyA9IFtdO1xuICBmb3IgKHZhciBsID0gYmVzdC5sbWluOyAobCAtIGJlc3QubG1heCkgPD0gMUUtMTA7IGwgKz0gYmVzdC5sc3RlcCkge1xuICAgIGxhYmVscy5wdXNoKGwpO1xuICB9XG4gIGJlc3QubGFiZWxzID0gbGFiZWxzO1xuICByZXR1cm4oYmVzdCk7XG59XG5cblxuIiwiICBcbiAgZ3JwaC5saW5lID0gZ3JwaF9ncmFwaF9saW5lO1xuICBncnBoLm1hcCA9IGdycGhfZ3JhcGhfbWFwO1xuICBncnBoLmJ1YmJsZSA9IGdycGhfZ3JhcGhfYnViYmxlO1xuICBncnBoLmJhciA9IGdycGhfZ3JhcGhfYmFyO1xuXG4gIHRoaXMuZ3JwaCA9IGdycGg7XG5cbn0oKSk7XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
