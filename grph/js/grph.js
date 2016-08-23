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
        .text(function(d) { return d;})
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
        .text(function(d) { return d;})
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
        var ticks = scale_.ticks();
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
    "label-threshold" : 13
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
    console.log('n=', n, '; d=', d);
    var year_labels = d > settings['label-threshold'];
    var year_small = d < settings['label-year-small'];
    return {
      month : {ticks : month_ticks, labels : month_labels},
      quarter : {ticks : quarter_ticks, labels : quarter_ticks},
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
    unit = m[2];
  }

  return function(value){
    return (factor*value).toLocaleString() + " " + unit || "-";
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

  var graph = grph_generic_graph(axes, dispatch, "line", function(g, data) {
    function nest_colour(d) {
      return axes.colour.variable() ? d[axes.colour.variable()] : 1;
    }
    var d = d3.nest().key(nest_colour).entries(data);
    // draw lines 
    var line = d3.svg.line().x(axes.x.scale).y(axes.y.scale);
    for (var i = 0; i < d.length; ++i) {
      g.append("path").attr("d", line(d[i].values))
        .attr("class", axes.colour.scale(d[i].key))
        .datum(d[i]);
    }
    // draw points 
    for (i = 0; i < d.length; ++i) {
      var cls = "circle" + i;
      g.selectAll("circle.circle" + i).data(d[i].values).enter().append("circle")
        .attr("class", "circle" + i + " " + axes.colour.scale(d[i].key))
        .attr("cx", axes.x.scale).attr("cy", axes.y.scale)
        .attr("r", settings('point_size'));
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
      if (!d.key) dispatch.pointover.call(self, variable, value, d);
    }).on("mouseout", function(d, i) {
      var variable = axes.colour.variable();
      var value = variable ? (d.key || d[variable]) : undefined;
      dispatch.mouseout.call(self, variable, value, d);
      if (!d.key) dispatch.pointout.call(self, variable, value, d);
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
  dispatch.on("pointover", function(variable, value, d) {
    this.selectAll(".hline").attr("y1", axes.y.scale(d)).attr("y2", axes.y.scale(d))
      .style("visibility", "visible");
    this.selectAll(".vline").attr("x1", axes.x.scale(d)).attr("x2", axes.x.scale(d))
      .style("visibility", "visible");
  });
  dispatch.on("pointout", function(variable, value, d) {
    this.selectAll(".hline").style("visibility", "hidden");
    this.selectAll(".vline").style("visibility", "hidden");
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
  // store previously calculated values; as the size of certain labels are 
  // requested again and again this greatly enhances performance
  var sizes_ = {};

  function label_size(label) {
    if (sizes_[label]) {
      return sizes_[label];
    }
    if (!g_) return [undefined, undefined];
    var text = g_.append("text").text(label);
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
    return ticks_.map(function(t) { return format_number(t, "", ndec_);});
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
    var year_max = max.year();
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
      'point_size' : 4,
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
  if (unit === undefined) unit = '';
  if (dec === undefined) dec = '.';
  if (grp === undefined) grp = '';
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vbWVudC5qcyIsInR3aXguanMiLCJiZWdpbi5qcyIsImF4aXNfY2F0ZWdvcmljYWwuanMiLCJheGlzX2NobG9yb3BsZXRoLmpzIiwiYXhpc19jb2xvdXIuanMiLCJheGlzX2xpbmVhci5qcyIsImF4aXNfcGVyaW9kLmpzIiwiYXhpc19yZWdpb24uanMiLCJheGlzX3NpemUuanMiLCJheGlzX3NwbGl0LmpzIiwiYXhpc19zd2l0Y2guanMiLCJkYXRhcGFja2FnZS5qcyIsImRhdGVfcGVyaW9kLmpzIiwiZ2VuZXJpY19ncmFwaC5qcyIsImdyYXBoLmpzIiwiZ3JhcGhfYmFyLmpzIiwiZ3JhcGhfYnViYmxlLmpzIiwiZ3JhcGhfbGluZS5qcyIsImdyYXBoX21hcC5qcyIsImxhYmVsX3NpemUuanMiLCJzY2FsZV9jYXRlZ29yaWNhbC5qcyIsInNjYWxlX2NobG9yb3BsZXRoLmpzIiwic2NhbGVfY29sb3VyLmpzIiwic2NhbGVfbGluZWFyLmpzIiwic2NhbGVfcGVyaW9kLmpzIiwic2NhbGVfc2l6ZS5qcyIsInNldHRpbmdzLmpzIiwidXRpbHMuanMiLCJ3aWxraW5zb24uanMiLCJlbmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNXRCQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdycGguanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyEgbW9tZW50LmpzXG4vLyEgdmVyc2lvbiA6IDIuNy4wXG4vLyEgYXV0aG9ycyA6IFRpbSBXb29kLCBJc2tyZW4gQ2hlcm5ldiwgTW9tZW50LmpzIGNvbnRyaWJ1dG9yc1xuLy8hIGxpY2Vuc2UgOiBNSVRcbi8vISBtb21lbnRqcy5jb21cblxuKGZ1bmN0aW9uICh1bmRlZmluZWQpIHtcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgQ29uc3RhbnRzXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgdmFyIG1vbWVudCxcbiAgICAgICAgVkVSU0lPTiA9IFwiMi43LjBcIixcbiAgICAgICAgLy8gdGhlIGdsb2JhbC1zY29wZSB0aGlzIGlzIE5PVCB0aGUgZ2xvYmFsIG9iamVjdCBpbiBOb2RlLmpzXG4gICAgICAgIGdsb2JhbFNjb3BlID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0aGlzLFxuICAgICAgICBvbGRHbG9iYWxNb21lbnQsXG4gICAgICAgIHJvdW5kID0gTWF0aC5yb3VuZCxcbiAgICAgICAgaSxcblxuICAgICAgICBZRUFSID0gMCxcbiAgICAgICAgTU9OVEggPSAxLFxuICAgICAgICBEQVRFID0gMixcbiAgICAgICAgSE9VUiA9IDMsXG4gICAgICAgIE1JTlVURSA9IDQsXG4gICAgICAgIFNFQ09ORCA9IDUsXG4gICAgICAgIE1JTExJU0VDT05EID0gNixcblxuICAgICAgICAvLyBpbnRlcm5hbCBzdG9yYWdlIGZvciBsYW5ndWFnZSBjb25maWcgZmlsZXNcbiAgICAgICAgbGFuZ3VhZ2VzID0ge30sXG5cbiAgICAgICAgLy8gbW9tZW50IGludGVybmFsIHByb3BlcnRpZXNcbiAgICAgICAgbW9tZW50UHJvcGVydGllcyA9IHtcbiAgICAgICAgICAgIF9pc0FNb21lbnRPYmplY3Q6IG51bGwsXG4gICAgICAgICAgICBfaSA6IG51bGwsXG4gICAgICAgICAgICBfZiA6IG51bGwsXG4gICAgICAgICAgICBfbCA6IG51bGwsXG4gICAgICAgICAgICBfc3RyaWN0IDogbnVsbCxcbiAgICAgICAgICAgIF90em0gOiBudWxsLFxuICAgICAgICAgICAgX2lzVVRDIDogbnVsbCxcbiAgICAgICAgICAgIF9vZmZzZXQgOiBudWxsLCAgLy8gb3B0aW9uYWwuIENvbWJpbmUgd2l0aCBfaXNVVENcbiAgICAgICAgICAgIF9wZiA6IG51bGwsXG4gICAgICAgICAgICBfbGFuZyA6IG51bGwgIC8vIG9wdGlvbmFsXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gY2hlY2sgZm9yIG5vZGVKU1xuICAgICAgICBoYXNNb2R1bGUgPSAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpLFxuXG4gICAgICAgIC8vIEFTUC5ORVQganNvbiBkYXRlIGZvcm1hdCByZWdleFxuICAgICAgICBhc3BOZXRKc29uUmVnZXggPSAvXlxcLz9EYXRlXFwoKFxcLT9cXGQrKS9pLFxuICAgICAgICBhc3BOZXRUaW1lU3Bhbkpzb25SZWdleCA9IC8oXFwtKT8oPzooXFxkKilcXC4pPyhcXGQrKVxcOihcXGQrKSg/OlxcOihcXGQrKVxcLj8oXFxkezN9KT8pPy8sXG5cbiAgICAgICAgLy8gZnJvbSBodHRwOi8vZG9jcy5jbG9zdXJlLWxpYnJhcnkuZ29vZ2xlY29kZS5jb20vZ2l0L2Nsb3N1cmVfZ29vZ19kYXRlX2RhdGUuanMuc291cmNlLmh0bWxcbiAgICAgICAgLy8gc29tZXdoYXQgbW9yZSBpbiBsaW5lIHdpdGggNC40LjMuMiAyMDA0IHNwZWMsIGJ1dCBhbGxvd3MgZGVjaW1hbCBhbnl3aGVyZVxuICAgICAgICBpc29EdXJhdGlvblJlZ2V4ID0gL14oLSk/UCg/Oig/OihbMC05LC5dKilZKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKUQpPyg/OlQoPzooWzAtOSwuXSopSCk/KD86KFswLTksLl0qKU0pPyg/OihbMC05LC5dKilTKT8pP3woWzAtOSwuXSopVykkLyxcblxuICAgICAgICAvLyBmb3JtYXQgdG9rZW5zXG4gICAgICAgIGZvcm1hdHRpbmdUb2tlbnMgPSAvKFxcW1teXFxbXSpcXF0pfChcXFxcKT8oTW98TU0/TT9NP3xEb3xERERvfEREP0Q/RD98ZGRkP2Q/fGRvP3x3W298d10/fFdbb3xXXT98UXxZWVlZWVl8WVlZWVl8WVlZWXxZWXxnZyhnZ2c/KT98R0coR0dHPyk/fGV8RXxhfEF8aGg/fEhIP3xtbT98c3M/fFN7MSw0fXxYfHp6P3xaWj98LikvZyxcbiAgICAgICAgbG9jYWxGb3JtYXR0aW5nVG9rZW5zID0gLyhcXFtbXlxcW10qXFxdKXwoXFxcXCk/KExUfExMP0w/TD98bHsxLDR9KS9nLFxuXG4gICAgICAgIC8vIHBhcnNpbmcgdG9rZW4gcmVnZXhlc1xuICAgICAgICBwYXJzZVRva2VuT25lT3JUd29EaWdpdHMgPSAvXFxkXFxkPy8sIC8vIDAgLSA5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9UaHJlZURpZ2l0cyA9IC9cXGR7MSwzfS8sIC8vIDAgLSA5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvRm91ckRpZ2l0cyA9IC9cXGR7MSw0fS8sIC8vIDAgLSA5OTk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1NpeERpZ2l0cyA9IC9bK1xcLV0/XFxkezEsNn0vLCAvLyAtOTk5LDk5OSAtIDk5OSw5OTlcbiAgICAgICAgcGFyc2VUb2tlbkRpZ2l0cyA9IC9cXGQrLywgLy8gbm9uemVybyBudW1iZXIgb2YgZGlnaXRzXG4gICAgICAgIHBhcnNlVG9rZW5Xb3JkID0gL1swLTldKlsnYS16XFx1MDBBMC1cXHUwNUZGXFx1MDcwMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSt8W1xcdTA2MDAtXFx1MDZGRlxcL10rKFxccyo/W1xcdTA2MDAtXFx1MDZGRl0rKXsxLDJ9L2ksIC8vIGFueSB3b3JkIChvciB0d28pIGNoYXJhY3RlcnMgb3IgbnVtYmVycyBpbmNsdWRpbmcgdHdvL3RocmVlIHdvcmQgbW9udGggaW4gYXJhYmljLlxuICAgICAgICBwYXJzZVRva2VuVGltZXpvbmUgPSAvWnxbXFwrXFwtXVxcZFxcZDo/XFxkXFxkL2dpLCAvLyArMDA6MDAgLTAwOjAwICswMDAwIC0wMDAwIG9yIFpcbiAgICAgICAgcGFyc2VUb2tlblQgPSAvVC9pLCAvLyBUIChJU08gc2VwYXJhdG9yKVxuICAgICAgICBwYXJzZVRva2VuVGltZXN0YW1wTXMgPSAvW1xcK1xcLV0/XFxkKyhcXC5cXGR7MSwzfSk/LywgLy8gMTIzNDU2Nzg5IDEyMzQ1Njc4OS4xMjNcbiAgICAgICAgcGFyc2VUb2tlbk9yZGluYWwgPSAvXFxkezEsMn0vLFxuXG4gICAgICAgIC8vc3RyaWN0IHBhcnNpbmcgcmVnZXhlc1xuICAgICAgICBwYXJzZVRva2VuT25lRGlnaXQgPSAvXFxkLywgLy8gMCAtIDlcbiAgICAgICAgcGFyc2VUb2tlblR3b0RpZ2l0cyA9IC9cXGRcXGQvLCAvLyAwMCAtIDk5XG4gICAgICAgIHBhcnNlVG9rZW5UaHJlZURpZ2l0cyA9IC9cXGR7M30vLCAvLyAwMDAgLSA5OTlcbiAgICAgICAgcGFyc2VUb2tlbkZvdXJEaWdpdHMgPSAvXFxkezR9LywgLy8gMDAwMCAtIDk5OTlcbiAgICAgICAgcGFyc2VUb2tlblNpeERpZ2l0cyA9IC9bKy1dP1xcZHs2fS8sIC8vIC05OTksOTk5IC0gOTk5LDk5OVxuICAgICAgICBwYXJzZVRva2VuU2lnbmVkTnVtYmVyID0gL1srLV0/XFxkKy8sIC8vIC1pbmYgLSBpbmZcblxuICAgICAgICAvLyBpc28gODYwMSByZWdleFxuICAgICAgICAvLyAwMDAwLTAwLTAwIDAwMDAtVzAwIG9yIDAwMDAtVzAwLTAgKyBUICsgMDAgb3IgMDA6MDAgb3IgMDA6MDA6MDAgb3IgMDA6MDA6MDAuMDAwICsgKzAwOjAwIG9yICswMDAwIG9yICswMClcbiAgICAgICAgaXNvUmVnZXggPSAvXlxccyooPzpbKy1dXFxkezZ9fFxcZHs0fSktKD86KFxcZFxcZC1cXGRcXGQpfChXXFxkXFxkJCl8KFdcXGRcXGQtXFxkKXwoXFxkXFxkXFxkKSkoKFR8ICkoXFxkXFxkKDpcXGRcXGQoOlxcZFxcZChcXC5cXGQrKT8pPyk/KT8oW1xcK1xcLV1cXGRcXGQoPzo6P1xcZFxcZCk/fFxccypaKT8pPyQvLFxuXG4gICAgICAgIGlzb0Zvcm1hdCA9ICdZWVlZLU1NLUREVEhIOm1tOnNzWicsXG5cbiAgICAgICAgaXNvRGF0ZXMgPSBbXG4gICAgICAgICAgICBbJ1lZWVlZWS1NTS1ERCcsIC9bKy1dXFxkezZ9LVxcZHsyfS1cXGR7Mn0vXSxcbiAgICAgICAgICAgIFsnWVlZWS1NTS1ERCcsIC9cXGR7NH0tXFxkezJ9LVxcZHsyfS9dLFxuICAgICAgICAgICAgWydHR0dHLVtXXVdXLUUnLCAvXFxkezR9LVdcXGR7Mn0tXFxkL10sXG4gICAgICAgICAgICBbJ0dHR0ctW1ddV1cnLCAvXFxkezR9LVdcXGR7Mn0vXSxcbiAgICAgICAgICAgIFsnWVlZWS1EREQnLCAvXFxkezR9LVxcZHszfS9dXG4gICAgICAgIF0sXG5cbiAgICAgICAgLy8gaXNvIHRpbWUgZm9ybWF0cyBhbmQgcmVnZXhlc1xuICAgICAgICBpc29UaW1lcyA9IFtcbiAgICAgICAgICAgIFsnSEg6bW06c3MuU1NTUycsIC8oVHwgKVxcZFxcZDpcXGRcXGQ6XFxkXFxkXFwuXFxkKy9dLFxuICAgICAgICAgICAgWydISDptbTpzcycsIC8oVHwgKVxcZFxcZDpcXGRcXGQ6XFxkXFxkL10sXG4gICAgICAgICAgICBbJ0hIOm1tJywgLyhUfCApXFxkXFxkOlxcZFxcZC9dLFxuICAgICAgICAgICAgWydISCcsIC8oVHwgKVxcZFxcZC9dXG4gICAgICAgIF0sXG5cbiAgICAgICAgLy8gdGltZXpvbmUgY2h1bmtlciBcIisxMDowMFwiID4gW1wiMTBcIiwgXCIwMFwiXSBvciBcIi0xNTMwXCIgPiBbXCItMTVcIiwgXCIzMFwiXVxuICAgICAgICBwYXJzZVRpbWV6b25lQ2h1bmtlciA9IC8oW1xcK1xcLV18XFxkXFxkKS9naSxcblxuICAgICAgICAvLyBnZXR0ZXIgYW5kIHNldHRlciBuYW1lc1xuICAgICAgICBwcm94eUdldHRlcnNBbmRTZXR0ZXJzID0gJ0RhdGV8SG91cnN8TWludXRlc3xTZWNvbmRzfE1pbGxpc2Vjb25kcycuc3BsaXQoJ3wnKSxcbiAgICAgICAgdW5pdE1pbGxpc2Vjb25kRmFjdG9ycyA9IHtcbiAgICAgICAgICAgICdNaWxsaXNlY29uZHMnIDogMSxcbiAgICAgICAgICAgICdTZWNvbmRzJyA6IDFlMyxcbiAgICAgICAgICAgICdNaW51dGVzJyA6IDZlNCxcbiAgICAgICAgICAgICdIb3VycycgOiAzNmU1LFxuICAgICAgICAgICAgJ0RheXMnIDogODY0ZTUsXG4gICAgICAgICAgICAnTW9udGhzJyA6IDI1OTJlNixcbiAgICAgICAgICAgICdZZWFycycgOiAzMTUzNmU2XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5pdEFsaWFzZXMgPSB7XG4gICAgICAgICAgICBtcyA6ICdtaWxsaXNlY29uZCcsXG4gICAgICAgICAgICBzIDogJ3NlY29uZCcsXG4gICAgICAgICAgICBtIDogJ21pbnV0ZScsXG4gICAgICAgICAgICBoIDogJ2hvdXInLFxuICAgICAgICAgICAgZCA6ICdkYXknLFxuICAgICAgICAgICAgRCA6ICdkYXRlJyxcbiAgICAgICAgICAgIHcgOiAnd2VlaycsXG4gICAgICAgICAgICBXIDogJ2lzb1dlZWsnLFxuICAgICAgICAgICAgTSA6ICdtb250aCcsXG4gICAgICAgICAgICBRIDogJ3F1YXJ0ZXInLFxuICAgICAgICAgICAgeSA6ICd5ZWFyJyxcbiAgICAgICAgICAgIERERCA6ICdkYXlPZlllYXInLFxuICAgICAgICAgICAgZSA6ICd3ZWVrZGF5JyxcbiAgICAgICAgICAgIEUgOiAnaXNvV2Vla2RheScsXG4gICAgICAgICAgICBnZzogJ3dlZWtZZWFyJyxcbiAgICAgICAgICAgIEdHOiAnaXNvV2Vla1llYXInXG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FtZWxGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICBkYXlvZnllYXIgOiAnZGF5T2ZZZWFyJyxcbiAgICAgICAgICAgIGlzb3dlZWtkYXkgOiAnaXNvV2Vla2RheScsXG4gICAgICAgICAgICBpc293ZWVrIDogJ2lzb1dlZWsnLFxuICAgICAgICAgICAgd2Vla3llYXIgOiAnd2Vla1llYXInLFxuICAgICAgICAgICAgaXNvd2Vla3llYXIgOiAnaXNvV2Vla1llYXInXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gZm9ybWF0IGZ1bmN0aW9uIHN0cmluZ3NcbiAgICAgICAgZm9ybWF0RnVuY3Rpb25zID0ge30sXG5cbiAgICAgICAgLy8gZGVmYXVsdCByZWxhdGl2ZSB0aW1lIHRocmVzaG9sZHNcbiAgICAgICAgcmVsYXRpdmVUaW1lVGhyZXNob2xkcyA9IHtcbiAgICAgICAgICBzOiA0NSwgICAvL3NlY29uZHMgdG8gbWludXRlc1xuICAgICAgICAgIG06IDQ1LCAgIC8vbWludXRlcyB0byBob3Vyc1xuICAgICAgICAgIGg6IDIyLCAgIC8vaG91cnMgdG8gZGF5c1xuICAgICAgICAgIGRkOiAyNSwgIC8vZGF5cyB0byBtb250aCAobW9udGggPT0gMSlcbiAgICAgICAgICBkbTogNDUsICAvL2RheXMgdG8gbW9udGhzIChtb250aHMgPiAxKVxuICAgICAgICAgIGR5OiAzNDUgIC8vZGF5cyB0byB5ZWFyXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gdG9rZW5zIHRvIG9yZGluYWxpemUgYW5kIHBhZFxuICAgICAgICBvcmRpbmFsaXplVG9rZW5zID0gJ0RERCB3IFcgTSBEIGQnLnNwbGl0KCcgJyksXG4gICAgICAgIHBhZGRlZFRva2VucyA9ICdNIEQgSCBoIG0gcyB3IFcnLnNwbGl0KCcgJyksXG5cbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICBNICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbnRoKCkgKyAxO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIE1NTSAgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLm1vbnRoc1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU1NTSA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkubW9udGhzKHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgREREICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXlPZlllYXIoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRkICAgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLndlZWtkYXlzTWluKHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGRkICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkud2Vla2RheXNTaG9ydCh0aGlzLCBmb3JtYXQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRkZGQgOiBmdW5jdGlvbiAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLndlZWtkYXlzKHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZWVrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgVyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc29XZWVrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVkgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMueWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCksIDUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVlZWSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IHRoaXMueWVhcigpLCBzaWduID0geSA+PSAwID8gJysnIDogJy0nO1xuICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVmdFplcm9GaWxsKE1hdGguYWJzKHkpLCA2KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZ2dnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZ2dnZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMud2Vla1llYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR0cgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSAlIDEwMCwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR0dHRyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgR0dHR0cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLmlzb1dlZWtZZWFyKCksIDUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2Vla2RheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNvV2Vla2RheSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGEgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLm1lcmlkaWVtKHRoaXMuaG91cnMoKSwgdGhpcy5taW51dGVzKCksIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEEgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLm1lcmlkaWVtKHRoaXMuaG91cnMoKSwgdGhpcy5taW51dGVzKCksIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBIICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaCAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob3VycygpICUgMTIgfHwgMTI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5taW51dGVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZWNvbmRzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgUyAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9JbnQodGhpcy5taWxsaXNlY29uZHMoKSAvIDEwMCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1MgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRvSW50KHRoaXMubWlsbGlzZWNvbmRzKCkgLyAxMCksIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTUyAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLm1pbGxpc2Vjb25kcygpLCAzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTU1NTIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5taWxsaXNlY29uZHMoKSwgMyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWiAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IC10aGlzLnpvbmUoKSxcbiAgICAgICAgICAgICAgICAgICAgYiA9IFwiK1wiO1xuICAgICAgICAgICAgICAgIGlmIChhIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBhID0gLWE7XG4gICAgICAgICAgICAgICAgICAgIGIgPSBcIi1cIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIgKyBsZWZ0WmVyb0ZpbGwodG9JbnQoYSAvIDYwKSwgMikgKyBcIjpcIiArIGxlZnRaZXJvRmlsbCh0b0ludChhKSAlIDYwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBaWiAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gLXRoaXMuem9uZSgpLFxuICAgICAgICAgICAgICAgICAgICBiID0gXCIrXCI7XG4gICAgICAgICAgICAgICAgaWYgKGEgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGEgPSAtYTtcbiAgICAgICAgICAgICAgICAgICAgYiA9IFwiLVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYiArIGxlZnRaZXJvRmlsbCh0b0ludChhIC8gNjApLCAyKSArIGxlZnRaZXJvRmlsbCh0b0ludChhKSAlIDYwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB6IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmVBYmJyKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgenogOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuem9uZU5hbWUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBYICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnVuaXgoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBRIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1YXJ0ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBsaXN0cyA9IFsnbW9udGhzJywgJ21vbnRoc1Nob3J0JywgJ3dlZWtkYXlzJywgJ3dlZWtkYXlzU2hvcnQnLCAnd2Vla2RheXNNaW4nXTtcblxuICAgIC8vIFBpY2sgdGhlIGZpcnN0IGRlZmluZWQgb2YgdHdvIG9yIHRocmVlIGFyZ3VtZW50cy4gZGZsIGNvbWVzIGZyb21cbiAgICAvLyBkZWZhdWx0LlxuICAgIGZ1bmN0aW9uIGRmbChhLCBiLCBjKSB7XG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAyOiByZXR1cm4gYSAhPSBudWxsID8gYSA6IGI7XG4gICAgICAgICAgICBjYXNlIDM6IHJldHVybiBhICE9IG51bGwgPyBhIDogYiAhPSBudWxsID8gYiA6IGM7XG4gICAgICAgICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoXCJJbXBsZW1lbnQgbWVcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0UGFyc2luZ0ZsYWdzKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGRlZXAgY2xvbmUgdGhpcyBvYmplY3QsIGFuZCBlczUgc3RhbmRhcmQgaXMgbm90IHZlcnlcbiAgICAgICAgLy8gaGVscGZ1bC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVtcHR5IDogZmFsc2UsXG4gICAgICAgICAgICB1bnVzZWRUb2tlbnMgOiBbXSxcbiAgICAgICAgICAgIHVudXNlZElucHV0IDogW10sXG4gICAgICAgICAgICBvdmVyZmxvdyA6IC0yLFxuICAgICAgICAgICAgY2hhcnNMZWZ0T3ZlciA6IDAsXG4gICAgICAgICAgICBudWxsSW5wdXQgOiBmYWxzZSxcbiAgICAgICAgICAgIGludmFsaWRNb250aCA6IG51bGwsXG4gICAgICAgICAgICBpbnZhbGlkRm9ybWF0IDogZmFsc2UsXG4gICAgICAgICAgICB1c2VySW52YWxpZGF0ZWQgOiBmYWxzZSxcbiAgICAgICAgICAgIGlzbzogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXByZWNhdGUobXNnLCBmbikge1xuICAgICAgICB2YXIgZmlyc3RUaW1lID0gdHJ1ZTtcbiAgICAgICAgZnVuY3Rpb24gcHJpbnRNc2coKSB7XG4gICAgICAgICAgICBpZiAobW9tZW50LnN1cHByZXNzRGVwcmVjYXRpb25XYXJuaW5ncyA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkRlcHJlY2F0aW9uIHdhcm5pbmc6IFwiICsgbXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChmaXJzdFRpbWUpIHtcbiAgICAgICAgICAgICAgICBwcmludE1zZygpO1xuICAgICAgICAgICAgICAgIGZpcnN0VGltZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sIGZuKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYWRUb2tlbihmdW5jLCBjb3VudCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwoZnVuYy5jYWxsKHRoaXMsIGEpLCBjb3VudCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIG9yZGluYWxpemVUb2tlbihmdW5jLCBwZXJpb2QpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nKCkub3JkaW5hbChmdW5jLmNhbGwodGhpcywgYSksIHBlcmlvZCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgd2hpbGUgKG9yZGluYWxpemVUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgIGkgPSBvcmRpbmFsaXplVG9rZW5zLnBvcCgpO1xuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9uc1tpICsgJ28nXSA9IG9yZGluYWxpemVUb2tlbihmb3JtYXRUb2tlbkZ1bmN0aW9uc1tpXSwgaSk7XG4gICAgfVxuICAgIHdoaWxlIChwYWRkZWRUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgIGkgPSBwYWRkZWRUb2tlbnMucG9wKCk7XG4gICAgICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zW2kgKyBpXSA9IHBhZFRva2VuKGZvcm1hdFRva2VuRnVuY3Rpb25zW2ldLCAyKTtcbiAgICB9XG4gICAgZm9ybWF0VG9rZW5GdW5jdGlvbnMuRERERCA9IHBhZFRva2VuKGZvcm1hdFRva2VuRnVuY3Rpb25zLkRERCwgMyk7XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgQ29uc3RydWN0b3JzXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gTGFuZ3VhZ2UoKSB7XG5cbiAgICB9XG5cbiAgICAvLyBNb21lbnQgcHJvdG90eXBlIG9iamVjdFxuICAgIGZ1bmN0aW9uIE1vbWVudChjb25maWcpIHtcbiAgICAgICAgY2hlY2tPdmVyZmxvdyhjb25maWcpO1xuICAgICAgICBleHRlbmQodGhpcywgY29uZmlnKTtcbiAgICB9XG5cbiAgICAvLyBEdXJhdGlvbiBDb25zdHJ1Y3RvclxuICAgIGZ1bmN0aW9uIER1cmF0aW9uKGR1cmF0aW9uKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSBub3JtYWxpemVPYmplY3RVbml0cyhkdXJhdGlvbiksXG4gICAgICAgICAgICB5ZWFycyA9IG5vcm1hbGl6ZWRJbnB1dC55ZWFyIHx8IDAsXG4gICAgICAgICAgICBxdWFydGVycyA9IG5vcm1hbGl6ZWRJbnB1dC5xdWFydGVyIHx8IDAsXG4gICAgICAgICAgICBtb250aHMgPSBub3JtYWxpemVkSW5wdXQubW9udGggfHwgMCxcbiAgICAgICAgICAgIHdlZWtzID0gbm9ybWFsaXplZElucHV0LndlZWsgfHwgMCxcbiAgICAgICAgICAgIGRheXMgPSBub3JtYWxpemVkSW5wdXQuZGF5IHx8IDAsXG4gICAgICAgICAgICBob3VycyA9IG5vcm1hbGl6ZWRJbnB1dC5ob3VyIHx8IDAsXG4gICAgICAgICAgICBtaW51dGVzID0gbm9ybWFsaXplZElucHV0Lm1pbnV0ZSB8fCAwLFxuICAgICAgICAgICAgc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQgfHwgMCxcbiAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IG5vcm1hbGl6ZWRJbnB1dC5taWxsaXNlY29uZCB8fCAwO1xuXG4gICAgICAgIC8vIHJlcHJlc2VudGF0aW9uIGZvciBkYXRlQWRkUmVtb3ZlXG4gICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyA9ICttaWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgc2Vjb25kcyAqIDFlMyArIC8vIDEwMDBcbiAgICAgICAgICAgIG1pbnV0ZXMgKiA2ZTQgKyAvLyAxMDAwICogNjBcbiAgICAgICAgICAgIGhvdXJzICogMzZlNTsgLy8gMTAwMCAqIDYwICogNjBcbiAgICAgICAgLy8gQmVjYXVzZSBvZiBkYXRlQWRkUmVtb3ZlIHRyZWF0cyAyNCBob3VycyBhcyBkaWZmZXJlbnQgZnJvbSBhXG4gICAgICAgIC8vIGRheSB3aGVuIHdvcmtpbmcgYXJvdW5kIERTVCwgd2UgbmVlZCB0byBzdG9yZSB0aGVtIHNlcGFyYXRlbHlcbiAgICAgICAgdGhpcy5fZGF5cyA9ICtkYXlzICtcbiAgICAgICAgICAgIHdlZWtzICogNztcbiAgICAgICAgLy8gSXQgaXMgaW1wb3NzaWJsZSB0cmFuc2xhdGUgbW9udGhzIGludG8gZGF5cyB3aXRob3V0IGtub3dpbmdcbiAgICAgICAgLy8gd2hpY2ggbW9udGhzIHlvdSBhcmUgYXJlIHRhbGtpbmcgYWJvdXQsIHNvIHdlIGhhdmUgdG8gc3RvcmVcbiAgICAgICAgLy8gaXQgc2VwYXJhdGVseS5cbiAgICAgICAgdGhpcy5fbW9udGhzID0gK21vbnRocyArXG4gICAgICAgICAgICBxdWFydGVycyAqIDMgK1xuICAgICAgICAgICAgeWVhcnMgKiAxMjtcblxuICAgICAgICB0aGlzLl9kYXRhID0ge307XG5cbiAgICAgICAgdGhpcy5fYnViYmxlKCk7XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBIZWxwZXJzXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBmdW5jdGlvbiBleHRlbmQoYSwgYikge1xuICAgICAgICBmb3IgKHZhciBpIGluIGIpIHtcbiAgICAgICAgICAgIGlmIChiLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgYVtpXSA9IGJbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYi5oYXNPd25Qcm9wZXJ0eShcInRvU3RyaW5nXCIpKSB7XG4gICAgICAgICAgICBhLnRvU3RyaW5nID0gYi50b1N0cmluZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChiLmhhc093blByb3BlcnR5KFwidmFsdWVPZlwiKSkge1xuICAgICAgICAgICAgYS52YWx1ZU9mID0gYi52YWx1ZU9mO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xvbmVNb21lbnQobSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0ge30sIGk7XG4gICAgICAgIGZvciAoaSBpbiBtKSB7XG4gICAgICAgICAgICBpZiAobS5oYXNPd25Qcm9wZXJ0eShpKSAmJiBtb21lbnRQcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2ldID0gbVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWJzUm91bmQobnVtYmVyKSB7XG4gICAgICAgIGlmIChudW1iZXIgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5jZWlsKG51bWJlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihudW1iZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gbGVmdCB6ZXJvIGZpbGwgYSBudW1iZXJcbiAgICAvLyBzZWUgaHR0cDovL2pzcGVyZi5jb20vbGVmdC16ZXJvLWZpbGxpbmcgZm9yIHBlcmZvcm1hbmNlIGNvbXBhcmlzb25cbiAgICBmdW5jdGlvbiBsZWZ0WmVyb0ZpbGwobnVtYmVyLCB0YXJnZXRMZW5ndGgsIGZvcmNlU2lnbikge1xuICAgICAgICB2YXIgb3V0cHV0ID0gJycgKyBNYXRoLmFicyhudW1iZXIpLFxuICAgICAgICAgICAgc2lnbiA9IG51bWJlciA+PSAwO1xuXG4gICAgICAgIHdoaWxlIChvdXRwdXQubGVuZ3RoIDwgdGFyZ2V0TGVuZ3RoKSB7XG4gICAgICAgICAgICBvdXRwdXQgPSAnMCcgKyBvdXRwdXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChzaWduID8gKGZvcmNlU2lnbiA/ICcrJyA6ICcnKSA6ICctJykgKyBvdXRwdXQ7XG4gICAgfVxuXG4gICAgLy8gaGVscGVyIGZ1bmN0aW9uIGZvciBfLmFkZFRpbWUgYW5kIF8uc3VidHJhY3RUaW1lXG4gICAgZnVuY3Rpb24gYWRkT3JTdWJ0cmFjdER1cmF0aW9uRnJvbU1vbWVudChtb20sIGR1cmF0aW9uLCBpc0FkZGluZywgdXBkYXRlT2Zmc2V0KSB7XG4gICAgICAgIHZhciBtaWxsaXNlY29uZHMgPSBkdXJhdGlvbi5fbWlsbGlzZWNvbmRzLFxuICAgICAgICAgICAgZGF5cyA9IGR1cmF0aW9uLl9kYXlzLFxuICAgICAgICAgICAgbW9udGhzID0gZHVyYXRpb24uX21vbnRocztcbiAgICAgICAgdXBkYXRlT2Zmc2V0ID0gdXBkYXRlT2Zmc2V0ID09IG51bGwgPyB0cnVlIDogdXBkYXRlT2Zmc2V0O1xuXG4gICAgICAgIGlmIChtaWxsaXNlY29uZHMpIHtcbiAgICAgICAgICAgIG1vbS5fZC5zZXRUaW1lKCttb20uX2QgKyBtaWxsaXNlY29uZHMgKiBpc0FkZGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRheXMpIHtcbiAgICAgICAgICAgIHJhd1NldHRlcihtb20sICdEYXRlJywgcmF3R2V0dGVyKG1vbSwgJ0RhdGUnKSArIGRheXMgKiBpc0FkZGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vbnRocykge1xuICAgICAgICAgICAgcmF3TW9udGhTZXR0ZXIobW9tLCByYXdHZXR0ZXIobW9tLCAnTW9udGgnKSArIG1vbnRocyAqIGlzQWRkaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXBkYXRlT2Zmc2V0KSB7XG4gICAgICAgICAgICBtb21lbnQudXBkYXRlT2Zmc2V0KG1vbSwgZGF5cyB8fCBtb250aHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgaXMgYW4gYXJyYXlcbiAgICBmdW5jdGlvbiBpc0FycmF5KGlucHV0KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaW5wdXQpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGF0ZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IERhdGVdJyB8fFxuICAgICAgICAgICAgICAgIGlucHV0IGluc3RhbmNlb2YgRGF0ZTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIHR3byBhcnJheXMsIHJldHVybiB0aGUgbnVtYmVyIG9mIGRpZmZlcmVuY2VzXG4gICAgZnVuY3Rpb24gY29tcGFyZUFycmF5cyhhcnJheTEsIGFycmF5MiwgZG9udENvbnZlcnQpIHtcbiAgICAgICAgdmFyIGxlbiA9IE1hdGgubWluKGFycmF5MS5sZW5ndGgsIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgbGVuZ3RoRGlmZiA9IE1hdGguYWJzKGFycmF5MS5sZW5ndGggLSBhcnJheTIubGVuZ3RoKSxcbiAgICAgICAgICAgIGRpZmZzID0gMCxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKChkb250Q29udmVydCAmJiBhcnJheTFbaV0gIT09IGFycmF5MltpXSkgfHxcbiAgICAgICAgICAgICAgICAoIWRvbnRDb252ZXJ0ICYmIHRvSW50KGFycmF5MVtpXSkgIT09IHRvSW50KGFycmF5MltpXSkpKSB7XG4gICAgICAgICAgICAgICAgZGlmZnMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlmZnMgKyBsZW5ndGhEaWZmO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVVuaXRzKHVuaXRzKSB7XG4gICAgICAgIGlmICh1bml0cykge1xuICAgICAgICAgICAgdmFyIGxvd2VyZWQgPSB1bml0cy50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyguKXMkLywgJyQxJyk7XG4gICAgICAgICAgICB1bml0cyA9IHVuaXRBbGlhc2VzW3VuaXRzXSB8fCBjYW1lbEZ1bmN0aW9uc1tsb3dlcmVkXSB8fCBsb3dlcmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bml0cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVPYmplY3RVbml0cyhpbnB1dE9iamVjdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZElucHV0ID0ge30sXG4gICAgICAgICAgICBub3JtYWxpemVkUHJvcCxcbiAgICAgICAgICAgIHByb3A7XG5cbiAgICAgICAgZm9yIChwcm9wIGluIGlucHV0T2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoaW5wdXRPYmplY3QuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkUHJvcCA9IG5vcm1hbGl6ZVVuaXRzKHByb3ApO1xuICAgICAgICAgICAgICAgIGlmIChub3JtYWxpemVkUHJvcCkge1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkSW5wdXRbbm9ybWFsaXplZFByb3BdID0gaW5wdXRPYmplY3RbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRJbnB1dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlTGlzdChmaWVsZCkge1xuICAgICAgICB2YXIgY291bnQsIHNldHRlcjtcblxuICAgICAgICBpZiAoZmllbGQuaW5kZXhPZignd2VlaycpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDc7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnZGF5JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChmaWVsZC5pbmRleE9mKCdtb250aCcpID09PSAwKSB7XG4gICAgICAgICAgICBjb3VudCA9IDEyO1xuICAgICAgICAgICAgc2V0dGVyID0gJ21vbnRoJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vbWVudFtmaWVsZF0gPSBmdW5jdGlvbiAoZm9ybWF0LCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGksIGdldHRlcixcbiAgICAgICAgICAgICAgICBtZXRob2QgPSBtb21lbnQuZm4uX2xhbmdbZmllbGRdLFxuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBmb3JtYXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBmb3JtYXQ7XG4gICAgICAgICAgICAgICAgZm9ybWF0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBnZXR0ZXIgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgICAgIHZhciBtID0gbW9tZW50KCkudXRjKCkuc2V0KHNldHRlciwgaSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1ldGhvZC5jYWxsKG1vbWVudC5mbi5fbGFuZywgbSwgZm9ybWF0IHx8ICcnKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpbmRleCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldHRlcihpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0dGVyKGkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9JbnQoYXJndW1lbnRGb3JDb2VyY2lvbikge1xuICAgICAgICB2YXIgY29lcmNlZE51bWJlciA9ICthcmd1bWVudEZvckNvZXJjaW9uLFxuICAgICAgICAgICAgdmFsdWUgPSAwO1xuXG4gICAgICAgIGlmIChjb2VyY2VkTnVtYmVyICE9PSAwICYmIGlzRmluaXRlKGNvZXJjZWROdW1iZXIpKSB7XG4gICAgICAgICAgICBpZiAoY29lcmNlZE51bWJlciA+PSAwKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLmZsb29yKGNvZXJjZWROdW1iZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGguY2VpbChjb2VyY2VkTnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5Nb250aCh5ZWFyLCBtb250aCkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGggKyAxLCAwKSkuZ2V0VVRDRGF0ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdlZWtzSW5ZZWFyKHllYXIsIGRvdywgZG95KSB7XG4gICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbWVudChbeWVhciwgMTEsIDMxICsgZG93IC0gZG95XSksIGRvdywgZG95KS53ZWVrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJblllYXIoeWVhcikge1xuICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih5ZWFyKSA/IDM2NiA6IDM2NTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuICh5ZWFyICUgNCA9PT0gMCAmJiB5ZWFyICUgMTAwICE9PSAwKSB8fCB5ZWFyICUgNDAwID09PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrT3ZlcmZsb3cobSkge1xuICAgICAgICB2YXIgb3ZlcmZsb3c7XG4gICAgICAgIGlmIChtLl9hICYmIG0uX3BmLm92ZXJmbG93ID09PSAtMikge1xuICAgICAgICAgICAgb3ZlcmZsb3cgPVxuICAgICAgICAgICAgICAgIG0uX2FbTU9OVEhdIDwgMCB8fCBtLl9hW01PTlRIXSA+IDExID8gTU9OVEggOlxuICAgICAgICAgICAgICAgIG0uX2FbREFURV0gPCAxIHx8IG0uX2FbREFURV0gPiBkYXlzSW5Nb250aChtLl9hW1lFQVJdLCBtLl9hW01PTlRIXSkgPyBEQVRFIDpcbiAgICAgICAgICAgICAgICBtLl9hW0hPVVJdIDwgMCB8fCBtLl9hW0hPVVJdID4gMjMgPyBIT1VSIDpcbiAgICAgICAgICAgICAgICBtLl9hW01JTlVURV0gPCAwIHx8IG0uX2FbTUlOVVRFXSA+IDU5ID8gTUlOVVRFIDpcbiAgICAgICAgICAgICAgICBtLl9hW1NFQ09ORF0gPCAwIHx8IG0uX2FbU0VDT05EXSA+IDU5ID8gU0VDT05EIDpcbiAgICAgICAgICAgICAgICBtLl9hW01JTExJU0VDT05EXSA8IDAgfHwgbS5fYVtNSUxMSVNFQ09ORF0gPiA5OTkgPyBNSUxMSVNFQ09ORCA6XG4gICAgICAgICAgICAgICAgLTE7XG5cbiAgICAgICAgICAgIGlmIChtLl9wZi5fb3ZlcmZsb3dEYXlPZlllYXIgJiYgKG92ZXJmbG93IDwgWUVBUiB8fCBvdmVyZmxvdyA+IERBVEUpKSB7XG4gICAgICAgICAgICAgICAgb3ZlcmZsb3cgPSBEQVRFO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtLl9wZi5vdmVyZmxvdyA9IG92ZXJmbG93O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNWYWxpZChtKSB7XG4gICAgICAgIGlmIChtLl9pc1ZhbGlkID09IG51bGwpIHtcbiAgICAgICAgICAgIG0uX2lzVmFsaWQgPSAhaXNOYU4obS5fZC5nZXRUaW1lKCkpICYmXG4gICAgICAgICAgICAgICAgbS5fcGYub3ZlcmZsb3cgPCAwICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLmVtcHR5ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLmludmFsaWRNb250aCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5udWxsSW5wdXQgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYuaW52YWxpZEZvcm1hdCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi51c2VySW52YWxpZGF0ZWQ7XG5cbiAgICAgICAgICAgIGlmIChtLl9zdHJpY3QpIHtcbiAgICAgICAgICAgICAgICBtLl9pc1ZhbGlkID0gbS5faXNWYWxpZCAmJlxuICAgICAgICAgICAgICAgICAgICBtLl9wZi5jaGFyc0xlZnRPdmVyID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLnVudXNlZFRva2Vucy5sZW5ndGggPT09IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG0uX2lzVmFsaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplTGFuZ3VhZ2Uoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkgPyBrZXkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKCdfJywgJy0nKSA6IGtleTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBtb21lbnQgZnJvbSBpbnB1dCwgdGhhdCBpcyBsb2NhbC91dGMvem9uZSBlcXVpdmFsZW50IHRvIG1vZGVsLlxuICAgIGZ1bmN0aW9uIG1ha2VBcyhpbnB1dCwgbW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLl9pc1VUQyA/IG1vbWVudChpbnB1dCkuem9uZShtb2RlbC5fb2Zmc2V0IHx8IDApIDpcbiAgICAgICAgICAgIG1vbWVudChpbnB1dCkubG9jYWwoKTtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIExhbmd1YWdlc1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZXh0ZW5kKExhbmd1YWdlLnByb3RvdHlwZSwge1xuXG4gICAgICAgIHNldCA6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIHZhciBwcm9wLCBpO1xuICAgICAgICAgICAgZm9yIChpIGluIGNvbmZpZykge1xuICAgICAgICAgICAgICAgIHByb3AgPSBjb25maWdbaV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbaV0gPSBwcm9wO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbJ18nICsgaV0gPSBwcm9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfbW9udGhzIDogXCJKYW51YXJ5X0ZlYnJ1YXJ5X01hcmNoX0FwcmlsX01heV9KdW5lX0p1bHlfQXVndXN0X1NlcHRlbWJlcl9PY3RvYmVyX05vdmVtYmVyX0RlY2VtYmVyXCIuc3BsaXQoXCJfXCIpLFxuICAgICAgICBtb250aHMgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21vbnRoc1ttLm1vbnRoKCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9tb250aHNTaG9ydCA6IFwiSmFuX0ZlYl9NYXJfQXByX01heV9KdW5fSnVsX0F1Z19TZXBfT2N0X05vdl9EZWNcIi5zcGxpdChcIl9cIiksXG4gICAgICAgIG1vbnRoc1Nob3J0IDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9tb250aHNTaG9ydFttLm1vbnRoKCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1vbnRoc1BhcnNlIDogZnVuY3Rpb24gKG1vbnRoTmFtZSkge1xuICAgICAgICAgICAgdmFyIGksIG1vbSwgcmVnZXg7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fbW9udGhzUGFyc2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIG1ha2UgdGhlIHJlZ2V4IGlmIHdlIGRvbid0IGhhdmUgaXQgYWxyZWFkeVxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fbW9udGhzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbW9tID0gbW9tZW50LnV0YyhbMjAwMCwgaV0pO1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMubW9udGhzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMubW9udGhzU2hvcnQobW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9tb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5cyA6IFwiU3VuZGF5X01vbmRheV9UdWVzZGF5X1dlZG5lc2RheV9UaHVyc2RheV9GcmlkYXlfU2F0dXJkYXlcIi5zcGxpdChcIl9cIiksXG4gICAgICAgIHdlZWtkYXlzIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1ttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBfd2Vla2RheXNTaG9ydCA6IFwiU3VuX01vbl9UdWVfV2VkX1RodV9GcmlfU2F0XCIuc3BsaXQoXCJfXCIpLFxuICAgICAgICB3ZWVrZGF5c1Nob3J0IDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c1Nob3J0W20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5c01pbiA6IFwiU3VfTW9fVHVfV2VfVGhfRnJfU2FcIi5zcGxpdChcIl9cIiksXG4gICAgICAgIHdlZWtkYXlzTWluIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c01pblttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrZGF5c1BhcnNlIDogZnVuY3Rpb24gKHdlZWtkYXlOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudChbMjAwMCwgMV0pLmRheShpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSAnXicgKyB0aGlzLndlZWtkYXlzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNTaG9ydChtb20sICcnKSArICd8XicgKyB0aGlzLndlZWtkYXlzTWluKG1vbSwgJycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl93ZWVrZGF5c1BhcnNlW2ldLnRlc3Qod2Vla2RheU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfbG9uZ0RhdGVGb3JtYXQgOiB7XG4gICAgICAgICAgICBMVCA6IFwiaDptbSBBXCIsXG4gICAgICAgICAgICBMIDogXCJNTS9ERC9ZWVlZXCIsXG4gICAgICAgICAgICBMTCA6IFwiTU1NTSBEIFlZWVlcIixcbiAgICAgICAgICAgIExMTCA6IFwiTU1NTSBEIFlZWVkgTFRcIixcbiAgICAgICAgICAgIExMTEwgOiBcImRkZGQsIE1NTU0gRCBZWVlZIExUXCJcbiAgICAgICAgfSxcbiAgICAgICAgbG9uZ0RhdGVGb3JtYXQgOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gdGhpcy5fbG9uZ0RhdGVGb3JtYXRba2V5XTtcbiAgICAgICAgICAgIGlmICghb3V0cHV0ICYmIHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleS50b1VwcGVyQ2FzZSgpXSkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleS50b1VwcGVyQ2FzZSgpXS5yZXBsYWNlKC9NTU1NfE1NfEREfGRkZGQvZywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleV0gPSBvdXRwdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzUE0gOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIC8vIElFOCBRdWlya3MgTW9kZSAmIElFNyBTdGFuZGFyZHMgTW9kZSBkbyBub3QgYWxsb3cgYWNjZXNzaW5nIHN0cmluZ3MgbGlrZSBhcnJheXNcbiAgICAgICAgICAgIC8vIFVzaW5nIGNoYXJBdCBzaG91bGQgYmUgbW9yZSBjb21wYXRpYmxlLlxuICAgICAgICAgICAgcmV0dXJuICgoaW5wdXQgKyAnJykudG9Mb3dlckNhc2UoKS5jaGFyQXQoMCkgPT09ICdwJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21lcmlkaWVtUGFyc2UgOiAvW2FwXVxcLj9tP1xcLj8vaSxcbiAgICAgICAgbWVyaWRpZW0gOiBmdW5jdGlvbiAoaG91cnMsIG1pbnV0ZXMsIGlzTG93ZXIpIHtcbiAgICAgICAgICAgIGlmIChob3VycyA+IDExKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzTG93ZXIgPyAncG0nIDogJ1BNJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlzTG93ZXIgPyAnYW0nIDogJ0FNJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfY2FsZW5kYXIgOiB7XG4gICAgICAgICAgICBzYW1lRGF5IDogJ1tUb2RheSBhdF0gTFQnLFxuICAgICAgICAgICAgbmV4dERheSA6ICdbVG9tb3Jyb3cgYXRdIExUJyxcbiAgICAgICAgICAgIG5leHRXZWVrIDogJ2RkZGQgW2F0XSBMVCcsXG4gICAgICAgICAgICBsYXN0RGF5IDogJ1tZZXN0ZXJkYXkgYXRdIExUJyxcbiAgICAgICAgICAgIGxhc3RXZWVrIDogJ1tMYXN0XSBkZGRkIFthdF0gTFQnLFxuICAgICAgICAgICAgc2FtZUVsc2UgOiAnTCdcbiAgICAgICAgfSxcbiAgICAgICAgY2FsZW5kYXIgOiBmdW5jdGlvbiAoa2V5LCBtb20pIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9jYWxlbmRhcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBvdXRwdXQgPT09ICdmdW5jdGlvbicgPyBvdXRwdXQuYXBwbHkobW9tKSA6IG91dHB1dDtcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVsYXRpdmVUaW1lIDoge1xuICAgICAgICAgICAgZnV0dXJlIDogXCJpbiAlc1wiLFxuICAgICAgICAgICAgcGFzdCA6IFwiJXMgYWdvXCIsXG4gICAgICAgICAgICBzIDogXCJhIGZldyBzZWNvbmRzXCIsXG4gICAgICAgICAgICBtIDogXCJhIG1pbnV0ZVwiLFxuICAgICAgICAgICAgbW0gOiBcIiVkIG1pbnV0ZXNcIixcbiAgICAgICAgICAgIGggOiBcImFuIGhvdXJcIixcbiAgICAgICAgICAgIGhoIDogXCIlZCBob3Vyc1wiLFxuICAgICAgICAgICAgZCA6IFwiYSBkYXlcIixcbiAgICAgICAgICAgIGRkIDogXCIlZCBkYXlzXCIsXG4gICAgICAgICAgICBNIDogXCJhIG1vbnRoXCIsXG4gICAgICAgICAgICBNTSA6IFwiJWQgbW9udGhzXCIsXG4gICAgICAgICAgICB5IDogXCJhIHllYXJcIixcbiAgICAgICAgICAgIHl5IDogXCIlZCB5ZWFyc1wiXG4gICAgICAgIH0sXG4gICAgICAgIHJlbGF0aXZlVGltZSA6IGZ1bmN0aW9uIChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbc3RyaW5nXTtcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgICAgICAgICAgICAgIG91dHB1dChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIDpcbiAgICAgICAgICAgICAgICBvdXRwdXQucmVwbGFjZSgvJWQvaSwgbnVtYmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgcGFzdEZ1dHVyZSA6IGZ1bmN0aW9uIChkaWZmLCBvdXRwdXQpIHtcbiAgICAgICAgICAgIHZhciBmb3JtYXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbZGlmZiA+IDAgPyAnZnV0dXJlJyA6ICdwYXN0J107XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGZvcm1hdCA9PT0gJ2Z1bmN0aW9uJyA/IGZvcm1hdChvdXRwdXQpIDogZm9ybWF0LnJlcGxhY2UoLyVzL2ksIG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcmRpbmFsLnJlcGxhY2UoXCIlZFwiLCBudW1iZXIpO1xuICAgICAgICB9LFxuICAgICAgICBfb3JkaW5hbCA6IFwiJWRcIixcblxuICAgICAgICBwcmVwYXJzZSA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcG9zdGZvcm1hdCA6IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2VlayA6IGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbSwgdGhpcy5fd2Vlay5kb3csIHRoaXMuX3dlZWsuZG95KS53ZWVrO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrIDoge1xuICAgICAgICAgICAgZG93IDogMCwgLy8gU3VuZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgICAgICAgICBkb3kgOiA2ICAvLyBUaGUgd2VlayB0aGF0IGNvbnRhaW5zIEphbiAxc3QgaXMgdGhlIGZpcnN0IHdlZWsgb2YgdGhlIHllYXIuXG4gICAgICAgIH0sXG5cbiAgICAgICAgX2ludmFsaWREYXRlOiAnSW52YWxpZCBkYXRlJyxcbiAgICAgICAgaW52YWxpZERhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbnZhbGlkRGF0ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTG9hZHMgYSBsYW5ndWFnZSBkZWZpbml0aW9uIGludG8gdGhlIGBsYW5ndWFnZXNgIGNhY2hlLiAgVGhlIGZ1bmN0aW9uXG4gICAgLy8gdGFrZXMgYSBrZXkgYW5kIG9wdGlvbmFsbHkgdmFsdWVzLiAgSWYgbm90IGluIHRoZSBicm93c2VyIGFuZCBubyB2YWx1ZXNcbiAgICAvLyBhcmUgcHJvdmlkZWQsIGl0IHdpbGwgbG9hZCB0aGUgbGFuZ3VhZ2UgZmlsZSBtb2R1bGUuICBBcyBhIGNvbnZlbmllbmNlLFxuICAgIC8vIHRoaXMgZnVuY3Rpb24gYWxzbyByZXR1cm5zIHRoZSBsYW5ndWFnZSB2YWx1ZXMuXG4gICAgZnVuY3Rpb24gbG9hZExhbmcoa2V5LCB2YWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLmFiYnIgPSBrZXk7XG4gICAgICAgIGlmICghbGFuZ3VhZ2VzW2tleV0pIHtcbiAgICAgICAgICAgIGxhbmd1YWdlc1trZXldID0gbmV3IExhbmd1YWdlKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGFuZ3VhZ2VzW2tleV0uc2V0KHZhbHVlcyk7XG4gICAgICAgIHJldHVybiBsYW5ndWFnZXNba2V5XTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgYSBsYW5ndWFnZSBmcm9tIHRoZSBgbGFuZ3VhZ2VzYCBjYWNoZS4gTW9zdGx5IHVzZWZ1bCBpbiB0ZXN0cy5cbiAgICBmdW5jdGlvbiB1bmxvYWRMYW5nKGtleSkge1xuICAgICAgICBkZWxldGUgbGFuZ3VhZ2VzW2tleV07XG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lcyB3aGljaCBsYW5ndWFnZSBkZWZpbml0aW9uIHRvIHVzZSBhbmQgcmV0dXJucyBpdC5cbiAgICAvL1xuICAgIC8vIFdpdGggbm8gcGFyYW1ldGVycywgaXQgd2lsbCByZXR1cm4gdGhlIGdsb2JhbCBsYW5ndWFnZS4gIElmIHlvdVxuICAgIC8vIHBhc3MgaW4gYSBsYW5ndWFnZSBrZXksIHN1Y2ggYXMgJ2VuJywgaXQgd2lsbCByZXR1cm4gdGhlXG4gICAgLy8gZGVmaW5pdGlvbiBmb3IgJ2VuJywgc28gbG9uZyBhcyAnZW4nIGhhcyBhbHJlYWR5IGJlZW4gbG9hZGVkIHVzaW5nXG4gICAgLy8gbW9tZW50LmxhbmcuXG4gICAgZnVuY3Rpb24gZ2V0TGFuZ0RlZmluaXRpb24oa2V5KSB7XG4gICAgICAgIHZhciBpID0gMCwgaiwgbGFuZywgbmV4dCwgc3BsaXQsXG4gICAgICAgICAgICBnZXQgPSBmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgICAgIGlmICghbGFuZ3VhZ2VzW2tdICYmIGhhc01vZHVsZSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZSgnLi9sYW5nLycgKyBrKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBsYW5ndWFnZXNba107XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmZuLl9sYW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0FycmF5KGtleSkpIHtcbiAgICAgICAgICAgIC8vc2hvcnQtY2lyY3VpdCBldmVyeXRoaW5nIGVsc2VcbiAgICAgICAgICAgIGxhbmcgPSBnZXQoa2V5KTtcbiAgICAgICAgICAgIGlmIChsYW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxhbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBrZXkgPSBba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vcGljayB0aGUgbGFuZ3VhZ2UgZnJvbSB0aGUgYXJyYXlcbiAgICAgICAgLy90cnkgWydlbi1hdScsICdlbi1nYiddIGFzICdlbi1hdScsICdlbi1nYicsICdlbicsIGFzIGluIG1vdmUgdGhyb3VnaCB0aGUgbGlzdCB0cnlpbmcgZWFjaFxuICAgICAgICAvL3N1YnN0cmluZyBmcm9tIG1vc3Qgc3BlY2lmaWMgdG8gbGVhc3QsIGJ1dCBtb3ZlIHRvIHRoZSBuZXh0IGFycmF5IGl0ZW0gaWYgaXQncyBhIG1vcmUgc3BlY2lmaWMgdmFyaWFudCB0aGFuIHRoZSBjdXJyZW50IHJvb3RcbiAgICAgICAgd2hpbGUgKGkgPCBrZXkubGVuZ3RoKSB7XG4gICAgICAgICAgICBzcGxpdCA9IG5vcm1hbGl6ZUxhbmd1YWdlKGtleVtpXSkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIGogPSBzcGxpdC5sZW5ndGg7XG4gICAgICAgICAgICBuZXh0ID0gbm9ybWFsaXplTGFuZ3VhZ2Uoa2V5W2kgKyAxXSk7XG4gICAgICAgICAgICBuZXh0ID0gbmV4dCA/IG5leHQuc3BsaXQoJy0nKSA6IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAoaiA+IDApIHtcbiAgICAgICAgICAgICAgICBsYW5nID0gZ2V0KHNwbGl0LnNsaWNlKDAsIGopLmpvaW4oJy0nKSk7XG4gICAgICAgICAgICAgICAgaWYgKGxhbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuZXh0ICYmIG5leHQubGVuZ3RoID49IGogJiYgY29tcGFyZUFycmF5cyhzcGxpdCwgbmV4dCwgdHJ1ZSkgPj0gaiAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGUgbmV4dCBhcnJheSBpdGVtIGlzIGJldHRlciB0aGFuIGEgc2hhbGxvd2VyIHN1YnN0cmluZyBvZiB0aGlzIG9uZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgai0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtb21lbnQuZm4uX2xhbmc7XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBGb3JtYXR0aW5nXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBmdW5jdGlvbiByZW1vdmVGb3JtYXR0aW5nVG9rZW5zKGlucHV0KSB7XG4gICAgICAgIGlmIChpbnB1dC5tYXRjaCgvXFxbW1xcc1xcU10vKSkge1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0LnJlcGxhY2UoL15cXFt8XFxdJC9nLCBcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXFxcXC9nLCBcIlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlRm9ybWF0RnVuY3Rpb24oZm9ybWF0KSB7XG4gICAgICAgIHZhciBhcnJheSA9IGZvcm1hdC5tYXRjaChmb3JtYXR0aW5nVG9rZW5zKSwgaSwgbGVuZ3RoO1xuXG4gICAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZm9ybWF0VG9rZW5GdW5jdGlvbnNbYXJyYXlbaV1dKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlbaV0gPSBmb3JtYXRUb2tlbkZ1bmN0aW9uc1thcnJheVtpXV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFycmF5W2ldID0gcmVtb3ZlRm9ybWF0dGluZ1Rva2VucyhhcnJheVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG1vbSkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IFwiXCI7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gYXJyYXlbaV0gaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGFycmF5W2ldLmNhbGwobW9tLCBmb3JtYXQpIDogYXJyYXlbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGZvcm1hdCBkYXRlIHVzaW5nIG5hdGl2ZSBkYXRlIG9iamVjdFxuICAgIGZ1bmN0aW9uIGZvcm1hdE1vbWVudChtLCBmb3JtYXQpIHtcblxuICAgICAgICBpZiAoIW0uaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbS5sYW5nKCkuaW52YWxpZERhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvcm1hdCA9IGV4cGFuZEZvcm1hdChmb3JtYXQsIG0ubGFuZygpKTtcblxuICAgICAgICBpZiAoIWZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKSB7XG4gICAgICAgICAgICBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSA9IG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKG0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cGFuZEZvcm1hdChmb3JtYXQsIGxhbmcpIHtcbiAgICAgICAgdmFyIGkgPSA1O1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlcGxhY2VMb25nRGF0ZUZvcm1hdFRva2VucyhpbnB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIGxhbmcubG9uZ0RhdGVGb3JtYXQoaW5wdXQpIHx8IGlucHV0O1xuICAgICAgICB9XG5cbiAgICAgICAgbG9jYWxGb3JtYXR0aW5nVG9rZW5zLmxhc3RJbmRleCA9IDA7XG4gICAgICAgIHdoaWxlIChpID49IDAgJiYgbG9jYWxGb3JtYXR0aW5nVG9rZW5zLnRlc3QoZm9ybWF0KSkge1xuICAgICAgICAgICAgZm9ybWF0ID0gZm9ybWF0LnJlcGxhY2UobG9jYWxGb3JtYXR0aW5nVG9rZW5zLCByZXBsYWNlTG9uZ0RhdGVGb3JtYXRUb2tlbnMpO1xuICAgICAgICAgICAgbG9jYWxGb3JtYXR0aW5nVG9rZW5zLmxhc3RJbmRleCA9IDA7XG4gICAgICAgICAgICBpIC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBQYXJzaW5nXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBnZXQgdGhlIHJlZ2V4IHRvIGZpbmQgdGhlIG5leHQgdG9rZW5cbiAgICBmdW5jdGlvbiBnZXRQYXJzZVJlZ2V4Rm9yVG9rZW4odG9rZW4sIGNvbmZpZykge1xuICAgICAgICB2YXIgYSwgc3RyaWN0ID0gY29uZmlnLl9zdHJpY3Q7XG4gICAgICAgIHN3aXRjaCAodG9rZW4pIHtcbiAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZURpZ2l0O1xuICAgICAgICBjYXNlICdEREREJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGhyZWVEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1lZWVknOlxuICAgICAgICBjYXNlICdHR0dHJzpcbiAgICAgICAgY2FzZSAnZ2dnZyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gcGFyc2VUb2tlbkZvdXJEaWdpdHMgOiBwYXJzZVRva2VuT25lVG9Gb3VyRGlnaXRzO1xuICAgICAgICBjYXNlICdZJzpcbiAgICAgICAgY2FzZSAnRyc6XG4gICAgICAgIGNhc2UgJ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5TaWduZWROdW1iZXI7XG4gICAgICAgIGNhc2UgJ1lZWVlZWSc6XG4gICAgICAgIGNhc2UgJ1lZWVlZJzpcbiAgICAgICAgY2FzZSAnR0dHR0cnOlxuICAgICAgICBjYXNlICdnZ2dnZyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gcGFyc2VUb2tlblNpeERpZ2l0cyA6IHBhcnNlVG9rZW5PbmVUb1NpeERpZ2l0cztcbiAgICAgICAgY2FzZSAnUyc6XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7IHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7IH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnU1MnOlxuICAgICAgICAgICAgaWYgKHN0cmljdCkgeyByZXR1cm4gcGFyc2VUb2tlblR3b0RpZ2l0czsgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdTU1MnOlxuICAgICAgICAgICAgaWYgKHN0cmljdCkgeyByZXR1cm4gcGFyc2VUb2tlblRocmVlRGlnaXRzOyB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ0RERCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZVRvVGhyZWVEaWdpdHM7XG4gICAgICAgIGNhc2UgJ01NTSc6XG4gICAgICAgIGNhc2UgJ01NTU0nOlxuICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgIGNhc2UgJ2RkZCc6XG4gICAgICAgIGNhc2UgJ2RkZGQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5Xb3JkO1xuICAgICAgICBjYXNlICdhJzpcbiAgICAgICAgY2FzZSAnQSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0TGFuZ0RlZmluaXRpb24oY29uZmlnLl9sKS5fbWVyaWRpZW1QYXJzZTtcbiAgICAgICAgY2FzZSAnWCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRpbWVzdGFtcE1zO1xuICAgICAgICBjYXNlICdaJzpcbiAgICAgICAgY2FzZSAnWlonOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaW1lem9uZTtcbiAgICAgICAgY2FzZSAnVCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblQ7XG4gICAgICAgIGNhc2UgJ1NTU1MnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5EaWdpdHM7XG4gICAgICAgIGNhc2UgJ01NJzpcbiAgICAgICAgY2FzZSAnREQnOlxuICAgICAgICBjYXNlICdZWSc6XG4gICAgICAgIGNhc2UgJ0dHJzpcbiAgICAgICAgY2FzZSAnZ2cnOlxuICAgICAgICBjYXNlICdISCc6XG4gICAgICAgIGNhc2UgJ2hoJzpcbiAgICAgICAgY2FzZSAnbW0nOlxuICAgICAgICBjYXNlICdzcyc6XG4gICAgICAgIGNhc2UgJ3d3JzpcbiAgICAgICAgY2FzZSAnV1cnOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IHBhcnNlVG9rZW5Ud29EaWdpdHMgOiBwYXJzZVRva2VuT25lT3JUd29EaWdpdHM7XG4gICAgICAgIGNhc2UgJ00nOlxuICAgICAgICBjYXNlICdEJzpcbiAgICAgICAgY2FzZSAnZCc6XG4gICAgICAgIGNhc2UgJ0gnOlxuICAgICAgICBjYXNlICdoJzpcbiAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgIGNhc2UgJ3MnOlxuICAgICAgICBjYXNlICd3JzpcbiAgICAgICAgY2FzZSAnVyc6XG4gICAgICAgIGNhc2UgJ2UnOlxuICAgICAgICBjYXNlICdFJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lT3JUd29EaWdpdHM7XG4gICAgICAgIGNhc2UgJ0RvJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT3JkaW5hbDtcbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICBhID0gbmV3IFJlZ0V4cChyZWdleHBFc2NhcGUodW5lc2NhcGVGb3JtYXQodG9rZW4ucmVwbGFjZSgnXFxcXCcsICcnKSksIFwiaVwiKSk7XG4gICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRpbWV6b25lTWludXRlc0Zyb21TdHJpbmcoc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZyB8fCBcIlwiO1xuICAgICAgICB2YXIgcG9zc2libGVUek1hdGNoZXMgPSAoc3RyaW5nLm1hdGNoKHBhcnNlVG9rZW5UaW1lem9uZSkgfHwgW10pLFxuICAgICAgICAgICAgdHpDaHVuayA9IHBvc3NpYmxlVHpNYXRjaGVzW3Bvc3NpYmxlVHpNYXRjaGVzLmxlbmd0aCAtIDFdIHx8IFtdLFxuICAgICAgICAgICAgcGFydHMgPSAodHpDaHVuayArICcnKS5tYXRjaChwYXJzZVRpbWV6b25lQ2h1bmtlcikgfHwgWyctJywgMCwgMF0sXG4gICAgICAgICAgICBtaW51dGVzID0gKyhwYXJ0c1sxXSAqIDYwKSArIHRvSW50KHBhcnRzWzJdKTtcblxuICAgICAgICByZXR1cm4gcGFydHNbMF0gPT09ICcrJyA/IC1taW51dGVzIDogbWludXRlcztcbiAgICB9XG5cbiAgICAvLyBmdW5jdGlvbiB0byBjb252ZXJ0IHN0cmluZyBpbnB1dCB0byBkYXRlXG4gICAgZnVuY3Rpb24gYWRkVGltZVRvQXJyYXlGcm9tVG9rZW4odG9rZW4sIGlucHV0LCBjb25maWcpIHtcbiAgICAgICAgdmFyIGEsIGRhdGVQYXJ0QXJyYXkgPSBjb25maWcuX2E7XG5cbiAgICAgICAgc3dpdGNoICh0b2tlbikge1xuICAgICAgICAvLyBRVUFSVEVSXG4gICAgICAgIGNhc2UgJ1EnOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W01PTlRIXSA9ICh0b0ludChpbnB1dCkgLSAxKSAqIDM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTU9OVEhcbiAgICAgICAgY2FzZSAnTScgOiAvLyBmYWxsIHRocm91Z2ggdG8gTU1cbiAgICAgICAgY2FzZSAnTU0nIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNT05USF0gPSB0b0ludChpbnB1dCkgLSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ01NTScgOiAvLyBmYWxsIHRocm91Z2ggdG8gTU1NTVxuICAgICAgICBjYXNlICdNTU1NJyA6XG4gICAgICAgICAgICBhID0gZ2V0TGFuZ0RlZmluaXRpb24oY29uZmlnLl9sKS5tb250aHNQYXJzZShpbnB1dCk7XG4gICAgICAgICAgICAvLyBpZiB3ZSBkaWRuJ3QgZmluZCBhIG1vbnRoIG5hbWUsIG1hcmsgdGhlIGRhdGUgYXMgaW52YWxpZC5cbiAgICAgICAgICAgIGlmIChhICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W01PTlRIXSA9IGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuaW52YWxpZE1vbnRoID0gaW5wdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gREFZIE9GIE1PTlRIXG4gICAgICAgIGNhc2UgJ0QnIDogLy8gZmFsbCB0aHJvdWdoIHRvIEREXG4gICAgICAgIGNhc2UgJ0REJyA6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbREFURV0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnRG8nIDpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtEQVRFXSA9IHRvSW50KHBhcnNlSW50KGlucHV0LCAxMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIERBWSBPRiBZRUFSXG4gICAgICAgIGNhc2UgJ0RERCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gRERERFxuICAgICAgICBjYXNlICdEREREJyA6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fZGF5T2ZZZWFyID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gWUVBUlxuICAgICAgICBjYXNlICdZWScgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtZRUFSXSA9IG1vbWVudC5wYXJzZVR3b0RpZ2l0WWVhcihpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnWVlZWScgOlxuICAgICAgICBjYXNlICdZWVlZWScgOlxuICAgICAgICBjYXNlICdZWVlZWVknIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbWUVBUl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gQU0gLyBQTVxuICAgICAgICBjYXNlICdhJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBBXG4gICAgICAgIGNhc2UgJ0EnIDpcbiAgICAgICAgICAgIGNvbmZpZy5faXNQbSA9IGdldExhbmdEZWZpbml0aW9uKGNvbmZpZy5fbCkuaXNQTShpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gMjQgSE9VUlxuICAgICAgICBjYXNlICdIJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBoaFxuICAgICAgICBjYXNlICdISCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gaGhcbiAgICAgICAgY2FzZSAnaCcgOiAvLyBmYWxsIHRocm91Z2ggdG8gaGhcbiAgICAgICAgY2FzZSAnaGgnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbSE9VUl0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlOVVRFXG4gICAgICAgIGNhc2UgJ20nIDogLy8gZmFsbCB0aHJvdWdoIHRvIG1tXG4gICAgICAgIGNhc2UgJ21tJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTlVURV0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gU0VDT05EXG4gICAgICAgIGNhc2UgJ3MnIDogLy8gZmFsbCB0aHJvdWdoIHRvIHNzXG4gICAgICAgIGNhc2UgJ3NzJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1NFQ09ORF0gPSB0b0ludChpbnB1dCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gTUlMTElTRUNPTkRcbiAgICAgICAgY2FzZSAnUycgOlxuICAgICAgICBjYXNlICdTUycgOlxuICAgICAgICBjYXNlICdTU1MnIDpcbiAgICAgICAgY2FzZSAnU1NTUycgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNSUxMSVNFQ09ORF0gPSB0b0ludCgoJzAuJyArIGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFVOSVggVElNRVNUQU1QIFdJVEggTVNcbiAgICAgICAgY2FzZSAnWCc6XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShwYXJzZUZsb2F0KGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFRJTUVaT05FXG4gICAgICAgIGNhc2UgJ1onIDogLy8gZmFsbCB0aHJvdWdoIHRvIFpaXG4gICAgICAgIGNhc2UgJ1paJyA6XG4gICAgICAgICAgICBjb25maWcuX3VzZVVUQyA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX3R6bSA9IHRpbWV6b25lTWludXRlc0Zyb21TdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFdFRUtEQVkgLSBodW1hblxuICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgIGNhc2UgJ2RkZCc6XG4gICAgICAgIGNhc2UgJ2RkZGQnOlxuICAgICAgICAgICAgYSA9IGdldExhbmdEZWZpbml0aW9uKGNvbmZpZy5fbCkud2Vla2RheXNQYXJzZShpbnB1dCk7XG4gICAgICAgICAgICAvLyBpZiB3ZSBkaWRuJ3QgZ2V0IGEgd2Vla2RheSBuYW1lLCBtYXJrIHRoZSBkYXRlIGFzIGludmFsaWRcbiAgICAgICAgICAgIGlmIChhICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICAgICAgY29uZmlnLl93WydkJ10gPSBhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLmludmFsaWRXZWVrZGF5ID0gaW5wdXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gV0VFSywgV0VFSyBEQVkgLSBudW1lcmljXG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICBjYXNlICd3dyc6XG4gICAgICAgIGNhc2UgJ1cnOlxuICAgICAgICBjYXNlICdXVyc6XG4gICAgICAgIGNhc2UgJ2QnOlxuICAgICAgICBjYXNlICdlJzpcbiAgICAgICAgY2FzZSAnRSc6XG4gICAgICAgICAgICB0b2tlbiA9IHRva2VuLnN1YnN0cigwLCAxKTtcbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnZ2dnZyc6XG4gICAgICAgIGNhc2UgJ0dHR0cnOlxuICAgICAgICBjYXNlICdHR0dHRyc6XG4gICAgICAgICAgICB0b2tlbiA9IHRva2VuLnN1YnN0cigwLCAyKTtcbiAgICAgICAgICAgIGlmIChpbnB1dCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgICAgICBjb25maWcuX3dbdG9rZW5dID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2dnJzpcbiAgICAgICAgY2FzZSAnR0cnOlxuICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgY29uZmlnLl93W3Rva2VuXSA9IG1vbWVudC5wYXJzZVR3b0RpZ2l0WWVhcihpbnB1dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlPZlllYXJGcm9tV2Vla0luZm8oY29uZmlnKSB7XG4gICAgICAgIHZhciB3LCB3ZWVrWWVhciwgd2Vlaywgd2Vla2RheSwgZG93LCBkb3ksIHRlbXAsIGxhbmc7XG5cbiAgICAgICAgdyA9IGNvbmZpZy5fdztcbiAgICAgICAgaWYgKHcuR0cgIT0gbnVsbCB8fCB3LlcgIT0gbnVsbCB8fCB3LkUgIT0gbnVsbCkge1xuICAgICAgICAgICAgZG93ID0gMTtcbiAgICAgICAgICAgIGRveSA9IDQ7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IFdlIG5lZWQgdG8gdGFrZSB0aGUgY3VycmVudCBpc29XZWVrWWVhciwgYnV0IHRoYXQgZGVwZW5kcyBvblxuICAgICAgICAgICAgLy8gaG93IHdlIGludGVycHJldCBub3cgKGxvY2FsLCB1dGMsIGZpeGVkIG9mZnNldCkuIFNvIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYSBub3cgdmVyc2lvbiBvZiBjdXJyZW50IGNvbmZpZyAodGFrZSBsb2NhbC91dGMvb2Zmc2V0IGZsYWdzLCBhbmRcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBub3cpLlxuICAgICAgICAgICAgd2Vla1llYXIgPSBkZmwody5HRywgY29uZmlnLl9hW1lFQVJdLCB3ZWVrT2ZZZWFyKG1vbWVudCgpLCAxLCA0KS55ZWFyKTtcbiAgICAgICAgICAgIHdlZWsgPSBkZmwody5XLCAxKTtcbiAgICAgICAgICAgIHdlZWtkYXkgPSBkZmwody5FLCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhbmcgPSBnZXRMYW5nRGVmaW5pdGlvbihjb25maWcuX2wpO1xuICAgICAgICAgICAgZG93ID0gbGFuZy5fd2Vlay5kb3c7XG4gICAgICAgICAgICBkb3kgPSBsYW5nLl93ZWVrLmRveTtcblxuICAgICAgICAgICAgd2Vla1llYXIgPSBkZmwody5nZywgY29uZmlnLl9hW1lFQVJdLCB3ZWVrT2ZZZWFyKG1vbWVudCgpLCBkb3csIGRveSkueWVhcik7XG4gICAgICAgICAgICB3ZWVrID0gZGZsKHcudywgMSk7XG5cbiAgICAgICAgICAgIGlmICh3LmQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIHdlZWtkYXkgLS0gbG93IGRheSBudW1iZXJzIGFyZSBjb25zaWRlcmVkIG5leHQgd2Vla1xuICAgICAgICAgICAgICAgIHdlZWtkYXkgPSB3LmQ7XG4gICAgICAgICAgICAgICAgaWYgKHdlZWtkYXkgPCBkb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgKyt3ZWVrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAody5lICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBsb2NhbCB3ZWVrZGF5IC0tIGNvdW50aW5nIHN0YXJ0cyBmcm9tIGJlZ2luaW5nIG9mIHdlZWtcbiAgICAgICAgICAgICAgICB3ZWVrZGF5ID0gdy5lICsgZG93O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IHRvIGJlZ2luaW5nIG9mIHdlZWtcbiAgICAgICAgICAgICAgICB3ZWVrZGF5ID0gZG93O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRlbXAgPSBkYXlPZlllYXJGcm9tV2Vla3Mod2Vla1llYXIsIHdlZWssIHdlZWtkYXksIGRveSwgZG93KTtcblxuICAgICAgICBjb25maWcuX2FbWUVBUl0gPSB0ZW1wLnllYXI7XG4gICAgICAgIGNvbmZpZy5fZGF5T2ZZZWFyID0gdGVtcC5kYXlPZlllYXI7XG4gICAgfVxuXG4gICAgLy8gY29udmVydCBhbiBhcnJheSB0byBhIGRhdGUuXG4gICAgLy8gdGhlIGFycmF5IHNob3VsZCBtaXJyb3IgdGhlIHBhcmFtZXRlcnMgYmVsb3dcbiAgICAvLyBub3RlOiBhbGwgdmFsdWVzIHBhc3QgdGhlIHllYXIgYXJlIG9wdGlvbmFsIGFuZCB3aWxsIGRlZmF1bHQgdG8gdGhlIGxvd2VzdCBwb3NzaWJsZSB2YWx1ZS5cbiAgICAvLyBbeWVhciwgbW9udGgsIGRheSAsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtaWxsaXNlY29uZF1cbiAgICBmdW5jdGlvbiBkYXRlRnJvbUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgdmFyIGksIGRhdGUsIGlucHV0ID0gW10sIGN1cnJlbnREYXRlLCB5ZWFyVG9Vc2U7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudERhdGUgPSBjdXJyZW50RGF0ZUFycmF5KGNvbmZpZyk7XG5cbiAgICAgICAgLy9jb21wdXRlIGRheSBvZiB0aGUgeWVhciBmcm9tIHdlZWtzIGFuZCB3ZWVrZGF5c1xuICAgICAgICBpZiAoY29uZmlnLl93ICYmIGNvbmZpZy5fYVtEQVRFXSA9PSBudWxsICYmIGNvbmZpZy5fYVtNT05USF0gPT0gbnVsbCkge1xuICAgICAgICAgICAgZGF5T2ZZZWFyRnJvbVdlZWtJbmZvKGNvbmZpZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvL2lmIHRoZSBkYXkgb2YgdGhlIHllYXIgaXMgc2V0LCBmaWd1cmUgb3V0IHdoYXQgaXQgaXNcbiAgICAgICAgaWYgKGNvbmZpZy5fZGF5T2ZZZWFyKSB7XG4gICAgICAgICAgICB5ZWFyVG9Vc2UgPSBkZmwoY29uZmlnLl9hW1lFQVJdLCBjdXJyZW50RGF0ZVtZRUFSXSk7XG5cbiAgICAgICAgICAgIGlmIChjb25maWcuX2RheU9mWWVhciA+IGRheXNJblllYXIoeWVhclRvVXNlKSkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYuX292ZXJmbG93RGF5T2ZZZWFyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGF0ZSA9IG1ha2VVVENEYXRlKHllYXJUb1VzZSwgMCwgY29uZmlnLl9kYXlPZlllYXIpO1xuICAgICAgICAgICAgY29uZmlnLl9hW01PTlRIXSA9IGRhdGUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtEQVRFXSA9IGRhdGUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byBjdXJyZW50IGRhdGUuXG4gICAgICAgIC8vICogaWYgbm8geWVhciwgbW9udGgsIGRheSBvZiBtb250aCBhcmUgZ2l2ZW4sIGRlZmF1bHQgdG8gdG9kYXlcbiAgICAgICAgLy8gKiBpZiBkYXkgb2YgbW9udGggaXMgZ2l2ZW4sIGRlZmF1bHQgbW9udGggYW5kIHllYXJcbiAgICAgICAgLy8gKiBpZiBtb250aCBpcyBnaXZlbiwgZGVmYXVsdCBvbmx5IHllYXJcbiAgICAgICAgLy8gKiBpZiB5ZWFyIGlzIGdpdmVuLCBkb24ndCBkZWZhdWx0IGFueXRoaW5nXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCAzICYmIGNvbmZpZy5fYVtpXSA9PSBudWxsOyArK2kpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtpXSA9IGlucHV0W2ldID0gY3VycmVudERhdGVbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBaZXJvIG91dCB3aGF0ZXZlciB3YXMgbm90IGRlZmF1bHRlZCwgaW5jbHVkaW5nIHRpbWVcbiAgICAgICAgZm9yICg7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtpXSA9IGlucHV0W2ldID0gKGNvbmZpZy5fYVtpXSA9PSBudWxsKSA/IChpID09PSAyID8gMSA6IDApIDogY29uZmlnLl9hW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9kID0gKGNvbmZpZy5fdXNlVVRDID8gbWFrZVVUQ0RhdGUgOiBtYWtlRGF0ZSkuYXBwbHkobnVsbCwgaW5wdXQpO1xuICAgICAgICAvLyBBcHBseSB0aW1lem9uZSBvZmZzZXQgZnJvbSBpbnB1dC4gVGhlIGFjdHVhbCB6b25lIGNhbiBiZSBjaGFuZ2VkXG4gICAgICAgIC8vIHdpdGggcGFyc2Vab25lLlxuICAgICAgICBpZiAoY29uZmlnLl90em0gIT0gbnVsbCkge1xuICAgICAgICAgICAgY29uZmlnLl9kLnNldFVUQ01pbnV0ZXMoY29uZmlnLl9kLmdldFVUQ01pbnV0ZXMoKSArIGNvbmZpZy5fdHptKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhdGVGcm9tT2JqZWN0KGNvbmZpZykge1xuICAgICAgICB2YXIgbm9ybWFsaXplZElucHV0O1xuXG4gICAgICAgIGlmIChjb25maWcuX2QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGNvbmZpZy5faSk7XG4gICAgICAgIGNvbmZpZy5fYSA9IFtcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC55ZWFyLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0Lm1vbnRoLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LmRheSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5ob3VyLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0Lm1pbnV0ZSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubWlsbGlzZWNvbmRcbiAgICAgICAgXTtcblxuICAgICAgICBkYXRlRnJvbUNvbmZpZyhjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKSB7XG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBpZiAoY29uZmlnLl91c2VVVEMpIHtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgbm93LmdldFVUQ0Z1bGxZZWFyKCksXG4gICAgICAgICAgICAgICAgbm93LmdldFVUQ01vbnRoKCksXG4gICAgICAgICAgICAgICAgbm93LmdldFVUQ0RhdGUoKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbbm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpLCBub3cuZ2V0RGF0ZSgpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBzdHJpbmcgYW5kIGZvcm1hdCBzdHJpbmdcbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKSB7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5fZiA9PT0gbW9tZW50LklTT184NjAxKSB7XG4gICAgICAgICAgICBwYXJzZUlTTyhjb25maWcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnLl9hID0gW107XG4gICAgICAgIGNvbmZpZy5fcGYuZW1wdHkgPSB0cnVlO1xuXG4gICAgICAgIC8vIFRoaXMgYXJyYXkgaXMgdXNlZCB0byBtYWtlIGEgRGF0ZSwgZWl0aGVyIHdpdGggYG5ldyBEYXRlYCBvciBgRGF0ZS5VVENgXG4gICAgICAgIHZhciBsYW5nID0gZ2V0TGFuZ0RlZmluaXRpb24oY29uZmlnLl9sKSxcbiAgICAgICAgICAgIHN0cmluZyA9ICcnICsgY29uZmlnLl9pLFxuICAgICAgICAgICAgaSwgcGFyc2VkSW5wdXQsIHRva2VucywgdG9rZW4sIHNraXBwZWQsXG4gICAgICAgICAgICBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuICAgICAgICAgICAgdG90YWxQYXJzZWRJbnB1dExlbmd0aCA9IDA7XG5cbiAgICAgICAgdG9rZW5zID0gZXhwYW5kRm9ybWF0KGNvbmZpZy5fZiwgbGFuZykubWF0Y2goZm9ybWF0dGluZ1Rva2VucykgfHwgW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbnNbaV07XG4gICAgICAgICAgICBwYXJzZWRJbnB1dCA9IChzdHJpbmcubWF0Y2goZ2V0UGFyc2VSZWdleEZvclRva2VuKHRva2VuLCBjb25maWcpKSB8fCBbXSlbMF07XG4gICAgICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBza2lwcGVkID0gc3RyaW5nLnN1YnN0cigwLCBzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkpO1xuICAgICAgICAgICAgICAgIGlmIChza2lwcGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRJbnB1dC5wdXNoKHNraXBwZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHJpbmcgPSBzdHJpbmcuc2xpY2Uoc3RyaW5nLmluZGV4T2YocGFyc2VkSW5wdXQpICsgcGFyc2VkSW5wdXQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB0b3RhbFBhcnNlZElucHV0TGVuZ3RoICs9IHBhcnNlZElucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGRvbid0IHBhcnNlIGlmIGl0J3Mgbm90IGEga25vd24gdG9rZW5cbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1t0b2tlbl0pIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9wZi5lbXB0eSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkZFRpbWVUb0FycmF5RnJvbVRva2VuKHRva2VuLCBwYXJzZWRJbnB1dCwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNvbmZpZy5fc3RyaWN0ICYmICFwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIHJlbWFpbmluZyB1bnBhcnNlZCBpbnB1dCBsZW5ndGggdG8gdGhlIHN0cmluZ1xuICAgICAgICBjb25maWcuX3BmLmNoYXJzTGVmdE92ZXIgPSBzdHJpbmdMZW5ndGggLSB0b3RhbFBhcnNlZElucHV0TGVuZ3RoO1xuICAgICAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkSW5wdXQucHVzaChzdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFuZGxlIGFtIHBtXG4gICAgICAgIGlmIChjb25maWcuX2lzUG0gJiYgY29uZmlnLl9hW0hPVVJdIDwgMTIpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSArPSAxMjtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBpcyAxMiBhbSwgY2hhbmdlIGhvdXJzIHRvIDBcbiAgICAgICAgaWYgKGNvbmZpZy5faXNQbSA9PT0gZmFsc2UgJiYgY29uZmlnLl9hW0hPVVJdID09PSAxMikge1xuICAgICAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgICAgIGNoZWNrT3ZlcmZsb3coY29uZmlnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bmVzY2FwZUZvcm1hdChzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xcXFwoXFxbKXxcXFxcKFxcXSl8XFxbKFteXFxdXFxbXSopXFxdfFxcXFwoLikvZywgZnVuY3Rpb24gKG1hdGNoZWQsIHAxLCBwMiwgcDMsIHA0KSB7XG4gICAgICAgICAgICByZXR1cm4gcDEgfHwgcDIgfHwgcDMgfHwgcDQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENvZGUgZnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1NjE0OTMvaXMtdGhlcmUtYS1yZWdleHAtZXNjYXBlLWZ1bmN0aW9uLWluLWphdmFzY3JpcHRcbiAgICBmdW5jdGlvbiByZWdleHBFc2NhcGUocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gc3RyaW5nIGFuZCBhcnJheSBvZiBmb3JtYXQgc3RyaW5nc1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEFycmF5KGNvbmZpZykge1xuICAgICAgICB2YXIgdGVtcENvbmZpZyxcbiAgICAgICAgICAgIGJlc3RNb21lbnQsXG5cbiAgICAgICAgICAgIHNjb3JlVG9CZWF0LFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9mLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkRm9ybWF0ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKE5hTik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29uZmlnLl9mLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgPSAwO1xuICAgICAgICAgICAgdGVtcENvbmZpZyA9IGV4dGVuZCh7fSwgY29uZmlnKTtcbiAgICAgICAgICAgIHRlbXBDb25maWcuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuICAgICAgICAgICAgdGVtcENvbmZpZy5fZiA9IGNvbmZpZy5fZltpXTtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEZvcm1hdCh0ZW1wQ29uZmlnKTtcblxuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKHRlbXBDb25maWcpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGFueSBpbnB1dCB0aGF0IHdhcyBub3QgcGFyc2VkIGFkZCBhIHBlbmFsdHkgZm9yIHRoYXQgZm9ybWF0XG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgKz0gdGVtcENvbmZpZy5fcGYuY2hhcnNMZWZ0T3ZlcjtcblxuICAgICAgICAgICAgLy9vciB0b2tlbnNcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSArPSB0ZW1wQ29uZmlnLl9wZi51bnVzZWRUb2tlbnMubGVuZ3RoICogMTA7XG5cbiAgICAgICAgICAgIHRlbXBDb25maWcuX3BmLnNjb3JlID0gY3VycmVudFNjb3JlO1xuXG4gICAgICAgICAgICBpZiAoc2NvcmVUb0JlYXQgPT0gbnVsbCB8fCBjdXJyZW50U2NvcmUgPCBzY29yZVRvQmVhdCkge1xuICAgICAgICAgICAgICAgIHNjb3JlVG9CZWF0ID0gY3VycmVudFNjb3JlO1xuICAgICAgICAgICAgICAgIGJlc3RNb21lbnQgPSB0ZW1wQ29uZmlnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0ZW5kKGNvbmZpZywgYmVzdE1vbWVudCB8fCB0ZW1wQ29uZmlnKTtcbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gaXNvIGZvcm1hdFxuICAgIGZ1bmN0aW9uIHBhcnNlSVNPKGNvbmZpZykge1xuICAgICAgICB2YXIgaSwgbCxcbiAgICAgICAgICAgIHN0cmluZyA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIG1hdGNoID0gaXNvUmVnZXguZXhlYyhzdHJpbmcpO1xuXG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5pc28gPSB0cnVlO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGlzb0RhdGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpc29EYXRlc1tpXVsxXS5leGVjKHN0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hbNV0gc2hvdWxkIGJlIFwiVFwiIG9yIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICBjb25maWcuX2YgPSBpc29EYXRlc1tpXVswXSArIChtYXRjaFs2XSB8fCBcIiBcIik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBpc29UaW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNvVGltZXNbaV1bMV0uZXhlYyhzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5fZiArPSBpc29UaW1lc1tpXVswXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0cmluZy5tYXRjaChwYXJzZVRva2VuVGltZXpvbmUpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9mICs9IFwiWlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWcuX2lzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBpc28gZm9ybWF0IG9yIGZhbGxiYWNrXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tU3RyaW5nKGNvbmZpZykge1xuICAgICAgICBwYXJzZUlTTyhjb25maWcpO1xuICAgICAgICBpZiAoY29uZmlnLl9pc1ZhbGlkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIGNvbmZpZy5faXNWYWxpZDtcbiAgICAgICAgICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tSW5wdXQoY29uZmlnKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIG1hdGNoZWQgPSBhc3BOZXRKc29uUmVnZXguZXhlYyhpbnB1dCk7XG5cbiAgICAgICAgaWYgKGlucHV0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hlZCkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK21hdGNoZWRbMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbVN0cmluZyhjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcuX2EgPSBpbnB1dC5zbGljZSgwKTtcbiAgICAgICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEYXRlKGlucHV0KSkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK2lucHV0KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZGF0ZUZyb21PYmplY3QoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YoaW5wdXQpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgLy8gZnJvbSBtaWxsaXNlY29uZHNcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGlucHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayhjb25maWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZURhdGUoeSwgbSwgZCwgaCwgTSwgcywgbXMpIHtcbiAgICAgICAgLy9jYW4ndCBqdXN0IGFwcGx5KCkgdG8gY3JlYXRlIGEgZGF0ZTpcbiAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE4MTM0OC9pbnN0YW50aWF0aW5nLWEtamF2YXNjcmlwdC1vYmplY3QtYnktY2FsbGluZy1wcm90b3R5cGUtY29uc3RydWN0b3ItYXBwbHlcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSh5LCBtLCBkLCBoLCBNLCBzLCBtcyk7XG5cbiAgICAgICAgLy90aGUgZGF0ZSBjb25zdHJ1Y3RvciBkb2Vzbid0IGFjY2VwdCB5ZWFycyA8IDE5NzBcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VVVENEYXRlKHkpIHtcbiAgICAgICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQy5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICAgICAgaWYgKHkgPCAxOTcwKSB7XG4gICAgICAgICAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShpbnB1dCwgbGFuZ3VhZ2UpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICghaXNOYU4oaW5wdXQpKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBwYXJzZUludChpbnB1dCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBsYW5ndWFnZS53ZWVrZGF5c1BhcnNlKGlucHV0KTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgUmVsYXRpdmUgVGltZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gaGVscGVyIGZ1bmN0aW9uIGZvciBtb21lbnQuZm4uZnJvbSwgbW9tZW50LmZuLmZyb21Ob3csIGFuZCBtb21lbnQuZHVyYXRpb24uZm4uaHVtYW5pemVcbiAgICBmdW5jdGlvbiBzdWJzdGl0dXRlVGltZUFnbyhzdHJpbmcsIG51bWJlciwgd2l0aG91dFN1ZmZpeCwgaXNGdXR1cmUsIGxhbmcpIHtcbiAgICAgICAgcmV0dXJuIGxhbmcucmVsYXRpdmVUaW1lKG51bWJlciB8fCAxLCAhIXdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbGF0aXZlVGltZShtaWxsaXNlY29uZHMsIHdpdGhvdXRTdWZmaXgsIGxhbmcpIHtcbiAgICAgICAgdmFyIHNlY29uZHMgPSByb3VuZChNYXRoLmFicyhtaWxsaXNlY29uZHMpIC8gMTAwMCksXG4gICAgICAgICAgICBtaW51dGVzID0gcm91bmQoc2Vjb25kcyAvIDYwKSxcbiAgICAgICAgICAgIGhvdXJzID0gcm91bmQobWludXRlcyAvIDYwKSxcbiAgICAgICAgICAgIGRheXMgPSByb3VuZChob3VycyAvIDI0KSxcbiAgICAgICAgICAgIHllYXJzID0gcm91bmQoZGF5cyAvIDM2NSksXG4gICAgICAgICAgICBhcmdzID0gc2Vjb25kcyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMucyAgJiYgWydzJywgc2Vjb25kc10gfHxcbiAgICAgICAgICAgICAgICBtaW51dGVzID09PSAxICYmIFsnbSddIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMubSAmJiBbJ21tJywgbWludXRlc10gfHxcbiAgICAgICAgICAgICAgICBob3VycyA9PT0gMSAmJiBbJ2gnXSB8fFxuICAgICAgICAgICAgICAgIGhvdXJzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5oICYmIFsnaGgnLCBob3Vyc10gfHxcbiAgICAgICAgICAgICAgICBkYXlzID09PSAxICYmIFsnZCddIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA8PSByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmRkICYmIFsnZGQnLCBkYXlzXSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPD0gcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5kbSAmJiBbJ00nXSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmR5ICYmIFsnTU0nLCByb3VuZChkYXlzIC8gMzApXSB8fFxuICAgICAgICAgICAgICAgIHllYXJzID09PSAxICYmIFsneSddIHx8IFsneXknLCB5ZWFyc107XG4gICAgICAgIGFyZ3NbMl0gPSB3aXRob3V0U3VmZml4O1xuICAgICAgICBhcmdzWzNdID0gbWlsbGlzZWNvbmRzID4gMDtcbiAgICAgICAgYXJnc1s0XSA9IGxhbmc7XG4gICAgICAgIHJldHVybiBzdWJzdGl0dXRlVGltZUFnby5hcHBseSh7fSwgYXJncyk7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFdlZWsgb2YgWWVhclxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gZmlyc3REYXlPZldlZWsgICAgICAgMCA9IHN1biwgNiA9IHNhdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBkYXkgb2YgdGhlIHdlZWsgdGhhdCBzdGFydHMgdGhlIHdlZWtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAodXN1YWxseSBzdW5kYXkgb3IgbW9uZGF5KVxuICAgIC8vIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIDAgPSBzdW4sIDYgPSBzYXRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZmlyc3Qgd2VlayBpcyB0aGUgd2VlayB0aGF0IGNvbnRhaW5zIHRoZSBmaXJzdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIG9mIHRoaXMgZGF5IG9mIHRoZSB3ZWVrXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgKGVnLiBJU08gd2Vla3MgdXNlIHRodXJzZGF5ICg0KSlcbiAgICBmdW5jdGlvbiB3ZWVrT2ZZZWFyKG1vbSwgZmlyc3REYXlPZldlZWssIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyKSB7XG4gICAgICAgIHZhciBlbmQgPSBmaXJzdERheU9mV2Vla09mWWVhciAtIGZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrID0gZmlyc3REYXlPZldlZWtPZlllYXIgLSBtb20uZGF5KCksXG4gICAgICAgICAgICBhZGp1c3RlZE1vbWVudDtcblxuXG4gICAgICAgIGlmIChkYXlzVG9EYXlPZldlZWsgPiBlbmQpIHtcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayAtPSA3O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRheXNUb0RheU9mV2VlayA8IGVuZCAtIDcpIHtcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayArPSA3O1xuICAgICAgICB9XG5cbiAgICAgICAgYWRqdXN0ZWRNb21lbnQgPSBtb21lbnQobW9tKS5hZGQoJ2QnLCBkYXlzVG9EYXlPZldlZWspO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd2VlazogTWF0aC5jZWlsKGFkanVzdGVkTW9tZW50LmRheU9mWWVhcigpIC8gNyksXG4gICAgICAgICAgICB5ZWFyOiBhZGp1c3RlZE1vbWVudC55ZWFyKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvL2h0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSVNPX3dlZWtfZGF0ZSNDYWxjdWxhdGluZ19hX2RhdGVfZ2l2ZW5fdGhlX3llYXIuMkNfd2Vla19udW1iZXJfYW5kX3dlZWtkYXlcbiAgICBmdW5jdGlvbiBkYXlPZlllYXJGcm9tV2Vla3MoeWVhciwgd2Vlaywgd2Vla2RheSwgZmlyc3REYXlPZldlZWtPZlllYXIsIGZpcnN0RGF5T2ZXZWVrKSB7XG4gICAgICAgIHZhciBkID0gbWFrZVVUQ0RhdGUoeWVhciwgMCwgMSkuZ2V0VVRDRGF5KCksIGRheXNUb0FkZCwgZGF5T2ZZZWFyO1xuXG4gICAgICAgIGQgPSBkID09PSAwID8gNyA6IGQ7XG4gICAgICAgIHdlZWtkYXkgPSB3ZWVrZGF5ICE9IG51bGwgPyB3ZWVrZGF5IDogZmlyc3REYXlPZldlZWs7XG4gICAgICAgIGRheXNUb0FkZCA9IGZpcnN0RGF5T2ZXZWVrIC0gZCArIChkID4gZmlyc3REYXlPZldlZWtPZlllYXIgPyA3IDogMCkgLSAoZCA8IGZpcnN0RGF5T2ZXZWVrID8gNyA6IDApO1xuICAgICAgICBkYXlPZlllYXIgPSA3ICogKHdlZWsgLSAxKSArICh3ZWVrZGF5IC0gZmlyc3REYXlPZldlZWspICsgZGF5c1RvQWRkICsgMTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeWVhcjogZGF5T2ZZZWFyID4gMCA/IHllYXIgOiB5ZWFyIC0gMSxcbiAgICAgICAgICAgIGRheU9mWWVhcjogZGF5T2ZZZWFyID4gMCA/ICBkYXlPZlllYXIgOiBkYXlzSW5ZZWFyKHllYXIgLSAxKSArIGRheU9mWWVhclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgVG9wIExldmVsIEZ1bmN0aW9uc1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIGZ1bmN0aW9uIG1ha2VNb21lbnQoY29uZmlnKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIGZvcm1hdCA9IGNvbmZpZy5fZjtcblxuICAgICAgICBpZiAoaW5wdXQgPT09IG51bGwgfHwgKGZvcm1hdCA9PT0gdW5kZWZpbmVkICYmIGlucHV0ID09PSAnJykpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuaW52YWxpZCh7bnVsbElucHV0OiB0cnVlfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uZmlnLl9pID0gaW5wdXQgPSBnZXRMYW5nRGVmaW5pdGlvbigpLnByZXBhcnNlKGlucHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb21lbnQuaXNNb21lbnQoaW5wdXQpKSB7XG4gICAgICAgICAgICBjb25maWcgPSBjbG9uZU1vbWVudChpbnB1dCk7XG5cbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCtpbnB1dC5fZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZm9ybWF0KSB7XG4gICAgICAgICAgICBpZiAoaXNBcnJheShmb3JtYXQpKSB7XG4gICAgICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kQXJyYXkoY29uZmlnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21JbnB1dChjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBNb21lbnQoY29uZmlnKTtcbiAgICB9XG5cbiAgICBtb21lbnQgPSBmdW5jdGlvbiAoaW5wdXQsIGZvcm1hdCwgbGFuZywgc3RyaWN0KSB7XG4gICAgICAgIHZhciBjO1xuXG4gICAgICAgIGlmICh0eXBlb2YobGFuZykgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICBzdHJpY3QgPSBsYW5nO1xuICAgICAgICAgICAgbGFuZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBvYmplY3QgY29uc3RydWN0aW9uIG11c3QgYmUgZG9uZSB0aGlzIHdheS5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MjNcbiAgICAgICAgYyA9IHt9O1xuICAgICAgICBjLl9pc0FNb21lbnRPYmplY3QgPSB0cnVlO1xuICAgICAgICBjLl9pID0gaW5wdXQ7XG4gICAgICAgIGMuX2YgPSBmb3JtYXQ7XG4gICAgICAgIGMuX2wgPSBsYW5nO1xuICAgICAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGMuX2lzVVRDID0gZmFsc2U7XG4gICAgICAgIGMuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuXG4gICAgICAgIHJldHVybiBtYWtlTW9tZW50KGMpO1xuICAgIH07XG5cbiAgICBtb21lbnQuc3VwcHJlc3NEZXByZWNhdGlvbldhcm5pbmdzID0gZmFsc2U7XG5cbiAgICBtb21lbnQuY3JlYXRlRnJvbUlucHV0RmFsbGJhY2sgPSBkZXByZWNhdGUoXG4gICAgICAgICAgICBcIm1vbWVudCBjb25zdHJ1Y3Rpb24gZmFsbHMgYmFjayB0byBqcyBEYXRlLiBUaGlzIGlzIFwiICtcbiAgICAgICAgICAgIFwiZGlzY291cmFnZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB1cGNvbWluZyBtYWpvciBcIiArXG4gICAgICAgICAgICBcInJlbGVhc2UuIFBsZWFzZSByZWZlciB0byBcIiArXG4gICAgICAgICAgICBcImh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDA3IGZvciBtb3JlIGluZm8uXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKGNvbmZpZy5faSk7XG4gICAgfSk7XG5cbiAgICAvLyBQaWNrIGEgbW9tZW50IG0gZnJvbSBtb21lbnRzIHNvIHRoYXQgbVtmbl0ob3RoZXIpIGlzIHRydWUgZm9yIGFsbFxuICAgIC8vIG90aGVyLiBUaGlzIHJlbGllcyBvbiB0aGUgZnVuY3Rpb24gZm4gdG8gYmUgdHJhbnNpdGl2ZS5cbiAgICAvL1xuICAgIC8vIG1vbWVudHMgc2hvdWxkIGVpdGhlciBiZSBhbiBhcnJheSBvZiBtb21lbnQgb2JqZWN0cyBvciBhbiBhcnJheSwgd2hvc2VcbiAgICAvLyBmaXJzdCBlbGVtZW50IGlzIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzLlxuICAgIGZ1bmN0aW9uIHBpY2tCeShmbiwgbW9tZW50cykge1xuICAgICAgICB2YXIgcmVzLCBpO1xuICAgICAgICBpZiAobW9tZW50cy5sZW5ndGggPT09IDEgJiYgaXNBcnJheShtb21lbnRzWzBdKSkge1xuICAgICAgICAgICAgbW9tZW50cyA9IG1vbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtb21lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHJlcyA9IG1vbWVudHNbMF07XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBtb21lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAobW9tZW50c1tpXVtmbl0ocmVzKSkge1xuICAgICAgICAgICAgICAgIHJlcyA9IG1vbWVudHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBtb21lbnQubWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblxuICAgICAgICByZXR1cm4gcGlja0J5KCdpc0JlZm9yZScsIGFyZ3MpO1xuICAgIH07XG5cbiAgICBtb21lbnQubWF4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblxuICAgICAgICByZXR1cm4gcGlja0J5KCdpc0FmdGVyJywgYXJncyk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0aW5nIHdpdGggdXRjXG4gICAgbW9tZW50LnV0YyA9IGZ1bmN0aW9uIChpbnB1dCwgZm9ybWF0LCBsYW5nLCBzdHJpY3QpIHtcbiAgICAgICAgdmFyIGM7XG5cbiAgICAgICAgaWYgKHR5cGVvZihsYW5nKSA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAgICAgICAgIHN0cmljdCA9IGxhbmc7XG4gICAgICAgICAgICBsYW5nID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIG9iamVjdCBjb25zdHJ1Y3Rpb24gbXVzdCBiZSBkb25lIHRoaXMgd2F5LlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQyM1xuICAgICAgICBjID0ge307XG4gICAgICAgIGMuX2lzQU1vbWVudE9iamVjdCA9IHRydWU7XG4gICAgICAgIGMuX3VzZVVUQyA9IHRydWU7XG4gICAgICAgIGMuX2lzVVRDID0gdHJ1ZTtcbiAgICAgICAgYy5fbCA9IGxhbmc7XG4gICAgICAgIGMuX2kgPSBpbnB1dDtcbiAgICAgICAgYy5fZiA9IGZvcm1hdDtcbiAgICAgICAgYy5fc3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBjLl9wZiA9IGRlZmF1bHRQYXJzaW5nRmxhZ3MoKTtcblxuICAgICAgICByZXR1cm4gbWFrZU1vbWVudChjKS51dGMoKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRpbmcgd2l0aCB1bml4IHRpbWVzdGFtcCAoaW4gc2Vjb25kcylcbiAgICBtb21lbnQudW5peCA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICByZXR1cm4gbW9tZW50KGlucHV0ICogMTAwMCk7XG4gICAgfTtcblxuICAgIC8vIGR1cmF0aW9uXG4gICAgbW9tZW50LmR1cmF0aW9uID0gZnVuY3Rpb24gKGlucHV0LCBrZXkpIHtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gaW5wdXQsXG4gICAgICAgICAgICAvLyBtYXRjaGluZyBhZ2FpbnN0IHJlZ2V4cCBpcyBleHBlbnNpdmUsIGRvIGl0IG9uIGRlbWFuZFxuICAgICAgICAgICAgbWF0Y2ggPSBudWxsLFxuICAgICAgICAgICAgc2lnbixcbiAgICAgICAgICAgIHJldCxcbiAgICAgICAgICAgIHBhcnNlSXNvO1xuXG4gICAgICAgIGlmIChtb21lbnQuaXNEdXJhdGlvbihpbnB1dCkpIHtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIG1zOiBpbnB1dC5fbWlsbGlzZWNvbmRzLFxuICAgICAgICAgICAgICAgIGQ6IGlucHV0Ll9kYXlzLFxuICAgICAgICAgICAgICAgIE06IGlucHV0Ll9tb250aHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbltrZXldID0gaW5wdXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uLm1pbGxpc2Vjb25kcyA9IGlucHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gYXNwTmV0VGltZVNwYW5Kc29uUmVnZXguZXhlYyhpbnB1dCkpKSB7XG4gICAgICAgICAgICBzaWduID0gKG1hdGNoWzFdID09PSBcIi1cIikgPyAtMSA6IDE7XG4gICAgICAgICAgICBkdXJhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgIGQ6IHRvSW50KG1hdGNoW0RBVEVdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgaDogdG9JbnQobWF0Y2hbSE9VUl0pICogc2lnbixcbiAgICAgICAgICAgICAgICBtOiB0b0ludChtYXRjaFtNSU5VVEVdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgczogdG9JbnQobWF0Y2hbU0VDT05EXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIG1zOiB0b0ludChtYXRjaFtNSUxMSVNFQ09ORF0pICogc2lnblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICghIShtYXRjaCA9IGlzb0R1cmF0aW9uUmVnZXguZXhlYyhpbnB1dCkpKSB7XG4gICAgICAgICAgICBzaWduID0gKG1hdGNoWzFdID09PSBcIi1cIikgPyAtMSA6IDE7XG4gICAgICAgICAgICBwYXJzZUlzbyA9IGZ1bmN0aW9uIChpbnApIHtcbiAgICAgICAgICAgICAgICAvLyBXZSdkIG5vcm1hbGx5IHVzZSB+fmlucCBmb3IgdGhpcywgYnV0IHVuZm9ydHVuYXRlbHkgaXQgYWxzb1xuICAgICAgICAgICAgICAgIC8vIGNvbnZlcnRzIGZsb2F0cyB0byBpbnRzLlxuICAgICAgICAgICAgICAgIC8vIGlucCBtYXkgYmUgdW5kZWZpbmVkLCBzbyBjYXJlZnVsIGNhbGxpbmcgcmVwbGFjZSBvbiBpdC5cbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gaW5wICYmIHBhcnNlRmxvYXQoaW5wLnJlcGxhY2UoJywnLCAnLicpKTtcbiAgICAgICAgICAgICAgICAvLyBhcHBseSBzaWduIHdoaWxlIHdlJ3JlIGF0IGl0XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpc05hTihyZXMpID8gMCA6IHJlcykgKiBzaWduO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIHk6IHBhcnNlSXNvKG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBNOiBwYXJzZUlzbyhtYXRjaFszXSksXG4gICAgICAgICAgICAgICAgZDogcGFyc2VJc28obWF0Y2hbNF0pLFxuICAgICAgICAgICAgICAgIGg6IHBhcnNlSXNvKG1hdGNoWzVdKSxcbiAgICAgICAgICAgICAgICBtOiBwYXJzZUlzbyhtYXRjaFs2XSksXG4gICAgICAgICAgICAgICAgczogcGFyc2VJc28obWF0Y2hbN10pLFxuICAgICAgICAgICAgICAgIHc6IHBhcnNlSXNvKG1hdGNoWzhdKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldCA9IG5ldyBEdXJhdGlvbihkdXJhdGlvbik7XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0KSAmJiBpbnB1dC5oYXNPd25Qcm9wZXJ0eSgnX2xhbmcnKSkge1xuICAgICAgICAgICAgcmV0Ll9sYW5nID0gaW5wdXQuX2xhbmc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICAvLyB2ZXJzaW9uIG51bWJlclxuICAgIG1vbWVudC52ZXJzaW9uID0gVkVSU0lPTjtcblxuICAgIC8vIGRlZmF1bHQgZm9ybWF0XG4gICAgbW9tZW50LmRlZmF1bHRGb3JtYXQgPSBpc29Gb3JtYXQ7XG5cbiAgICAvLyBjb25zdGFudCB0aGF0IHJlZmVycyB0byB0aGUgSVNPIHN0YW5kYXJkXG4gICAgbW9tZW50LklTT184NjAxID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAvLyBQbHVnaW5zIHRoYXQgYWRkIHByb3BlcnRpZXMgc2hvdWxkIGFsc28gYWRkIHRoZSBrZXkgaGVyZSAobnVsbCB2YWx1ZSksXG4gICAgLy8gc28gd2UgY2FuIHByb3Blcmx5IGNsb25lIG91cnNlbHZlcy5cbiAgICBtb21lbnQubW9tZW50UHJvcGVydGllcyA9IG1vbWVudFByb3BlcnRpZXM7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW5ldmVyIGEgbW9tZW50IGlzIG11dGF0ZWQuXG4gICAgLy8gSXQgaXMgaW50ZW5kZWQgdG8ga2VlcCB0aGUgb2Zmc2V0IGluIHN5bmMgd2l0aCB0aGUgdGltZXpvbmUuXG4gICAgbW9tZW50LnVwZGF0ZU9mZnNldCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgeW91IHRvIHNldCBhIHRocmVzaG9sZCBmb3IgcmVsYXRpdmUgdGltZSBzdHJpbmdzXG4gICAgbW9tZW50LnJlbGF0aXZlVGltZVRocmVzaG9sZCA9IGZ1bmN0aW9uKHRocmVzaG9sZCwgbGltaXQpIHtcbiAgICAgIGlmIChyZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF0gPSBsaW1pdDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHdpbGwgbG9hZCBsYW5ndWFnZXMgYW5kIHRoZW4gc2V0IHRoZSBnbG9iYWwgbGFuZ3VhZ2UuICBJZlxuICAgIC8vIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGluLCBpdCB3aWxsIHNpbXBseSByZXR1cm4gdGhlIGN1cnJlbnQgZ2xvYmFsXG4gICAgLy8gbGFuZ3VhZ2Uga2V5LlxuICAgIG1vbWVudC5sYW5nID0gZnVuY3Rpb24gKGtleSwgdmFsdWVzKSB7XG4gICAgICAgIHZhciByO1xuICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5mbi5fbGFuZy5fYWJicjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgICAgICBsb2FkTGFuZyhub3JtYWxpemVMYW5ndWFnZShrZXkpLCB2YWx1ZXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdW5sb2FkTGFuZyhrZXkpO1xuICAgICAgICAgICAga2V5ID0gJ2VuJztcbiAgICAgICAgfSBlbHNlIGlmICghbGFuZ3VhZ2VzW2tleV0pIHtcbiAgICAgICAgICAgIGdldExhbmdEZWZpbml0aW9uKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgciA9IG1vbWVudC5kdXJhdGlvbi5mbi5fbGFuZyA9IG1vbWVudC5mbi5fbGFuZyA9IGdldExhbmdEZWZpbml0aW9uKGtleSk7XG4gICAgICAgIHJldHVybiByLl9hYmJyO1xuICAgIH07XG5cbiAgICAvLyByZXR1cm5zIGxhbmd1YWdlIGRhdGFcbiAgICBtb21lbnQubGFuZ0RhdGEgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChrZXkgJiYga2V5Ll9sYW5nICYmIGtleS5fbGFuZy5fYWJicikge1xuICAgICAgICAgICAga2V5ID0ga2V5Ll9sYW5nLl9hYmJyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBnZXRMYW5nRGVmaW5pdGlvbihrZXkpO1xuICAgIH07XG5cbiAgICAvLyBjb21wYXJlIG1vbWVudCBvYmplY3RcbiAgICBtb21lbnQuaXNNb21lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBNb21lbnQgfHxcbiAgICAgICAgICAgIChvYmogIT0gbnVsbCAmJiAgb2JqLmhhc093blByb3BlcnR5KCdfaXNBTW9tZW50T2JqZWN0JykpO1xuICAgIH07XG5cbiAgICAvLyBmb3IgdHlwZWNoZWNraW5nIER1cmF0aW9uIG9iamVjdHNcbiAgICBtb21lbnQuaXNEdXJhdGlvbiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIER1cmF0aW9uO1xuICAgIH07XG5cbiAgICBmb3IgKGkgPSBsaXN0cy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBtYWtlTGlzdChsaXN0c1tpXSk7XG4gICAgfVxuXG4gICAgbW9tZW50Lm5vcm1hbGl6ZVVuaXRzID0gZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5pbnZhbGlkID0gZnVuY3Rpb24gKGZsYWdzKSB7XG4gICAgICAgIHZhciBtID0gbW9tZW50LnV0YyhOYU4pO1xuICAgICAgICBpZiAoZmxhZ3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZXh0ZW5kKG0uX3BmLCBmbGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBtLl9wZi51c2VySW52YWxpZGF0ZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG07XG4gICAgfTtcblxuICAgIG1vbWVudC5wYXJzZVpvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKS5wYXJzZVpvbmUoKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0b0ludChpbnB1dCkgKyAodG9JbnQoaW5wdXQpID4gNjggPyAxOTAwIDogMjAwMCk7XG4gICAgfTtcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgTW9tZW50IFByb3RvdHlwZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZXh0ZW5kKG1vbWVudC5mbiA9IE1vbWVudC5wcm90b3R5cGUsIHtcblxuICAgICAgICBjbG9uZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdmFsdWVPZiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiArdGhpcy5fZCArICgodGhpcy5fb2Zmc2V0IHx8IDApICogNjAwMDApO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVuaXggOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigrdGhpcyAvIDEwMDApO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvbmUoKS5sYW5nKCdlbicpLmZvcm1hdChcImRkZCBNTU0gREQgWVlZWSBISDptbTpzcyBbR01UXVpaXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRvRGF0ZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vZmZzZXQgPyBuZXcgRGF0ZSgrdGhpcykgOiB0aGlzLl9kO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRvSVNPU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG0gPSBtb21lbnQodGhpcykudXRjKCk7XG4gICAgICAgICAgICBpZiAoMCA8IG0ueWVhcigpICYmIG0ueWVhcigpIDw9IDk5OTkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0TW9tZW50KG0sICdZWVlZLU1NLUREW1RdSEg6bW06c3MuU1NTW1pdJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgJ1lZWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1taXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHRvQXJyYXkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIG0ueWVhcigpLFxuICAgICAgICAgICAgICAgIG0ubW9udGgoKSxcbiAgICAgICAgICAgICAgICBtLmRhdGUoKSxcbiAgICAgICAgICAgICAgICBtLmhvdXJzKCksXG4gICAgICAgICAgICAgICAgbS5taW51dGVzKCksXG4gICAgICAgICAgICAgICAgbS5zZWNvbmRzKCksXG4gICAgICAgICAgICAgICAgbS5taWxsaXNlY29uZHMoKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1ZhbGlkIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWQodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1RTaGlmdGVkIDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fYSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzVmFsaWQoKSAmJiBjb21wYXJlQXJyYXlzKHRoaXMuX2EsICh0aGlzLl9pc1VUQyA/IG1vbWVudC51dGModGhpcy5fYSkgOiBtb21lbnQodGhpcy5fYSkpLnRvQXJyYXkoKSkgPiAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFyc2luZ0ZsYWdzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGV4dGVuZCh7fSwgdGhpcy5fcGYpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGludmFsaWRBdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BmLm92ZXJmbG93O1xuICAgICAgICB9LFxuXG4gICAgICAgIHV0YyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmUoMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbG9jYWwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnpvbmUoMCk7XG4gICAgICAgICAgICB0aGlzLl9pc1VUQyA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZm9ybWF0IDogZnVuY3Rpb24gKGlucHV0U3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gZm9ybWF0TW9tZW50KHRoaXMsIGlucHV0U3RyaW5nIHx8IG1vbWVudC5kZWZhdWx0Rm9ybWF0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxhbmcoKS5wb3N0Zm9ybWF0KG91dHB1dCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkIDogZnVuY3Rpb24gKGlucHV0LCB2YWwpIHtcbiAgICAgICAgICAgIHZhciBkdXI7XG4gICAgICAgICAgICAvLyBzd2l0Y2ggYXJncyB0byBzdXBwb3J0IGFkZCgncycsIDEpIGFuZCBhZGQoMSwgJ3MnKVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24oaXNOYU4oK3ZhbCkgPyAraW5wdXQgOiArdmFsLCBpc05hTigrdmFsKSA/IHZhbCA6IGlucHV0KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbigrdmFsLCBpbnB1dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZE9yU3VidHJhY3REdXJhdGlvbkZyb21Nb21lbnQodGhpcywgZHVyLCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnRyYWN0IDogZnVuY3Rpb24gKGlucHV0LCB2YWwpIHtcbiAgICAgICAgICAgIHZhciBkdXI7XG4gICAgICAgICAgICAvLyBzd2l0Y2ggYXJncyB0byBzdXBwb3J0IHN1YnRyYWN0KCdzJywgMSkgYW5kIHN1YnRyYWN0KDEsICdzJylcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZHVyID0gbW9tZW50LmR1cmF0aW9uKGlzTmFOKCt2YWwpID8gK2lucHV0IDogK3ZhbCwgaXNOYU4oK3ZhbCkgPyB2YWwgOiBpbnB1dCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24oK3ZhbCwgaW5wdXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkdXIgPSBtb21lbnQuZHVyYXRpb24oaW5wdXQsIHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KHRoaXMsIGR1ciwgLTEpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGlmZiA6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMsIGFzRmxvYXQpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gbWFrZUFzKGlucHV0LCB0aGlzKSxcbiAgICAgICAgICAgICAgICB6b25lRGlmZiA9ICh0aGlzLnpvbmUoKSAtIHRoYXQuem9uZSgpKSAqIDZlNCxcbiAgICAgICAgICAgICAgICBkaWZmLCBvdXRwdXQ7XG5cbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd5ZWFyJyB8fCB1bml0cyA9PT0gJ21vbnRoJykge1xuICAgICAgICAgICAgICAgIC8vIGF2ZXJhZ2UgbnVtYmVyIG9mIGRheXMgaW4gdGhlIG1vbnRocyBpbiB0aGUgZ2l2ZW4gZGF0ZXNcbiAgICAgICAgICAgICAgICBkaWZmID0gKHRoaXMuZGF5c0luTW9udGgoKSArIHRoYXQuZGF5c0luTW9udGgoKSkgKiA0MzJlNTsgLy8gMjQgKiA2MCAqIDYwICogMTAwMCAvIDJcbiAgICAgICAgICAgICAgICAvLyBkaWZmZXJlbmNlIGluIG1vbnRoc1xuICAgICAgICAgICAgICAgIG91dHB1dCA9ICgodGhpcy55ZWFyKCkgLSB0aGF0LnllYXIoKSkgKiAxMikgKyAodGhpcy5tb250aCgpIC0gdGhhdC5tb250aCgpKTtcbiAgICAgICAgICAgICAgICAvLyBhZGp1c3QgYnkgdGFraW5nIGRpZmZlcmVuY2UgaW4gZGF5cywgYXZlcmFnZSBudW1iZXIgb2YgZGF5c1xuICAgICAgICAgICAgICAgIC8vIGFuZCBkc3QgaW4gdGhlIGdpdmVuIG1vbnRocy5cbiAgICAgICAgICAgICAgICBvdXRwdXQgKz0gKCh0aGlzIC0gbW9tZW50KHRoaXMpLnN0YXJ0T2YoJ21vbnRoJykpIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGF0IC0gbW9tZW50KHRoYXQpLnN0YXJ0T2YoJ21vbnRoJykpKSAvIGRpZmY7XG4gICAgICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2l0aCB6b25lcywgdG8gbmVnYXRlIGFsbCBkc3RcbiAgICAgICAgICAgICAgICBvdXRwdXQgLT0gKCh0aGlzLnpvbmUoKSAtIG1vbWVudCh0aGlzKS5zdGFydE9mKCdtb250aCcpLnpvbmUoKSkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoYXQuem9uZSgpIC0gbW9tZW50KHRoYXQpLnN0YXJ0T2YoJ21vbnRoJykuem9uZSgpKSkgKiA2ZTQgLyBkaWZmO1xuICAgICAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCAvIDEyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9ICh0aGlzIC0gdGhhdCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gdW5pdHMgPT09ICdzZWNvbmQnID8gZGlmZiAvIDFlMyA6IC8vIDEwMDBcbiAgICAgICAgICAgICAgICAgICAgdW5pdHMgPT09ICdtaW51dGUnID8gZGlmZiAvIDZlNCA6IC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ2hvdXInID8gZGlmZiAvIDM2ZTUgOiAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ2RheScgPyAoZGlmZiAtIHpvbmVEaWZmKSAvIDg2NGU1IDogLy8gMTAwMCAqIDYwICogNjAgKiAyNCwgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgICAgICB1bml0cyA9PT0gJ3dlZWsnID8gKGRpZmYgLSB6b25lRGlmZikgLyA2MDQ4ZTUgOiAvLyAxMDAwICogNjAgKiA2MCAqIDI0ICogNywgbmVnYXRlIGRzdFxuICAgICAgICAgICAgICAgICAgICBkaWZmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFzRmxvYXQgPyBvdXRwdXQgOiBhYnNSb3VuZChvdXRwdXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZyb20gOiBmdW5jdGlvbiAodGltZSwgd2l0aG91dFN1ZmZpeCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5kdXJhdGlvbih0aGlzLmRpZmYodGltZSkpLmxhbmcodGhpcy5sYW5nKCkuX2FiYnIpLmh1bWFuaXplKCF3aXRob3V0U3VmZml4KTtcbiAgICAgICAgfSxcblxuICAgICAgICBmcm9tTm93IDogZnVuY3Rpb24gKHdpdGhvdXRTdWZmaXgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZyb20obW9tZW50KCksIHdpdGhvdXRTdWZmaXgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGVuZGFyIDogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAgICAgICAgIC8vIFdlIHdhbnQgdG8gY29tcGFyZSB0aGUgc3RhcnQgb2YgdG9kYXksIHZzIHRoaXMuXG4gICAgICAgICAgICAvLyBHZXR0aW5nIHN0YXJ0LW9mLXRvZGF5IGRlcGVuZHMgb24gd2hldGhlciB3ZSdyZSB6b25lJ2Qgb3Igbm90LlxuICAgICAgICAgICAgdmFyIG5vdyA9IHRpbWUgfHwgbW9tZW50KCksXG4gICAgICAgICAgICAgICAgc29kID0gbWFrZUFzKG5vdywgdGhpcykuc3RhcnRPZignZGF5JyksXG4gICAgICAgICAgICAgICAgZGlmZiA9IHRoaXMuZGlmZihzb2QsICdkYXlzJywgdHJ1ZSksXG4gICAgICAgICAgICAgICAgZm9ybWF0ID0gZGlmZiA8IC02ID8gJ3NhbWVFbHNlJyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAtMSA/ICdsYXN0V2VlaycgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMCA/ICdsYXN0RGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAxID8gJ3NhbWVEYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDIgPyAnbmV4dERheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgNyA/ICduZXh0V2VlaycgOiAnc2FtZUVsc2UnO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KHRoaXMubGFuZygpLmNhbGVuZGFyKGZvcm1hdCwgdGhpcykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzTGVhcFllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih0aGlzLnllYXIoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1QgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHRoaXMuem9uZSgpIDwgdGhpcy5jbG9uZSgpLm1vbnRoKDApLnpvbmUoKSB8fFxuICAgICAgICAgICAgICAgIHRoaXMuem9uZSgpIDwgdGhpcy5jbG9uZSgpLm1vbnRoKDUpLnpvbmUoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgZGF5ID0gdGhpcy5faXNVVEMgPyB0aGlzLl9kLmdldFVUQ0RheSgpIDogdGhpcy5fZC5nZXREYXkoKTtcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVdlZWtkYXkoaW5wdXQsIHRoaXMubGFuZygpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoeyBkIDogaW5wdXQgLSBkYXkgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbW9udGggOiBtYWtlQWNjZXNzb3IoJ01vbnRoJywgdHJ1ZSksXG5cbiAgICAgICAgc3RhcnRPZjogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgc3dpdGNoIGludGVudGlvbmFsbHkgb21pdHMgYnJlYWsga2V5d29yZHNcbiAgICAgICAgICAgIC8vIHRvIHV0aWxpemUgZmFsbGluZyB0aHJvdWdoIHRoZSBjYXNlcy5cbiAgICAgICAgICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgICAgIGNhc2UgJ3llYXInOlxuICAgICAgICAgICAgICAgIHRoaXMubW9udGgoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAncXVhcnRlcic6XG4gICAgICAgICAgICBjYXNlICdtb250aCc6XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRlKDEpO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3dlZWsnOlxuICAgICAgICAgICAgY2FzZSAnaXNvV2Vlayc6XG4gICAgICAgICAgICBjYXNlICdkYXknOlxuICAgICAgICAgICAgICAgIHRoaXMuaG91cnMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAnaG91cic6XG4gICAgICAgICAgICAgICAgdGhpcy5taW51dGVzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgICAgICAgICAgICAgdGhpcy5taWxsaXNlY29uZHMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB3ZWVrcyBhcmUgYSBzcGVjaWFsIGNhc2VcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrZGF5KDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1bml0cyA9PT0gJ2lzb1dlZWsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc29XZWVrZGF5KDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBxdWFydGVycyBhcmUgYWxzbyBzcGVjaWFsXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIHRoaXMubW9udGgoTWF0aC5mbG9vcih0aGlzLm1vbnRoKCkgLyAzKSAqIDMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBlbmRPZjogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0T2YodW5pdHMpLmFkZCgodW5pdHMgPT09ICdpc29XZWVrJyA/ICd3ZWVrJyA6IHVuaXRzKSwgMSkuc3VidHJhY3QoJ21zJywgMSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNBZnRlcjogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSB0eXBlb2YgdW5pdHMgIT09ICd1bmRlZmluZWQnID8gdW5pdHMgOiAnbWlsbGlzZWNvbmQnO1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLmNsb25lKCkuc3RhcnRPZih1bml0cykgPiArbW9tZW50KGlucHV0KS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0JlZm9yZTogZnVuY3Rpb24gKGlucHV0LCB1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSB0eXBlb2YgdW5pdHMgIT09ICd1bmRlZmluZWQnID8gdW5pdHMgOiAnbWlsbGlzZWNvbmQnO1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzLmNsb25lKCkuc3RhcnRPZih1bml0cykgPCArbW9tZW50KGlucHV0KS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1NhbWU6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gdW5pdHMgfHwgJ21zJztcbiAgICAgICAgICAgIHJldHVybiArdGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpID09PSArbWFrZUFzKGlucHV0LCB0aGlzKS5zdGFydE9mKHVuaXRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBtaW46IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgXCJtb21lbnQoKS5taW4gaXMgZGVwcmVjYXRlZCwgdXNlIG1vbWVudC5taW4gaW5zdGVhZC4gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE1NDhcIixcbiAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICBvdGhlciA9IG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyIDwgdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgKSxcblxuICAgICAgICBtYXg6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICBcIm1vbWVudCgpLm1heCBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50Lm1heCBpbnN0ZWFkLiBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTU0OFwiLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICBvdGhlciA9IG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3RoZXIgPiB0aGlzID8gdGhpcyA6IG90aGVyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgKSxcblxuICAgICAgICAvLyBrZWVwVGltZSA9IHRydWUgbWVhbnMgb25seSBjaGFuZ2UgdGhlIHRpbWV6b25lLCB3aXRob3V0IGFmZmVjdGluZ1xuICAgICAgICAvLyB0aGUgbG9jYWwgaG91ci4gU28gNTozMToyNiArMDMwMCAtLVt6b25lKDIsIHRydWUpXS0tPiA1OjMxOjI2ICswMjAwXG4gICAgICAgIC8vIEl0IGlzIHBvc3NpYmxlIHRoYXQgNTozMToyNiBkb2Vzbid0IGV4aXN0IGludCB6b25lICswMjAwLCBzbyB3ZVxuICAgICAgICAvLyBhZGp1c3QgdGhlIHRpbWUgYXMgbmVlZGVkLCB0byBiZSB2YWxpZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gS2VlcGluZyB0aGUgdGltZSBhY3R1YWxseSBhZGRzL3N1YnRyYWN0cyAob25lIGhvdXIpXG4gICAgICAgIC8vIGZyb20gdGhlIGFjdHVhbCByZXByZXNlbnRlZCB0aW1lLiBUaGF0IGlzIHdoeSB3ZSBjYWxsIHVwZGF0ZU9mZnNldFxuICAgICAgICAvLyBhIHNlY29uZCB0aW1lLiBJbiBjYXNlIGl0IHdhbnRzIHVzIHRvIGNoYW5nZSB0aGUgb2Zmc2V0IGFnYWluXG4gICAgICAgIC8vIF9jaGFuZ2VJblByb2dyZXNzID09IHRydWUgY2FzZSwgdGhlbiB3ZSBoYXZlIHRvIGFkanVzdCwgYmVjYXVzZVxuICAgICAgICAvLyB0aGVyZSBpcyBubyBzdWNoIHRpbWUgaW4gdGhlIGdpdmVuIHRpbWV6b25lLlxuICAgICAgICB6b25lIDogZnVuY3Rpb24gKGlucHV0LCBrZWVwVGltZSkge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuX29mZnNldCB8fCAwO1xuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0ID0gdGltZXpvbmVNaW51dGVzRnJvbVN0cmluZyhpbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhpbnB1dCkgPCAxNikge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dCA9IGlucHV0ICogNjA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX29mZnNldCA9IGlucHV0O1xuICAgICAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAob2Zmc2V0ICE9PSBpbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWtlZXBUaW1lIHx8IHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZE9yU3VidHJhY3REdXJhdGlvbkZyb21Nb21lbnQodGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9tZW50LmR1cmF0aW9uKG9mZnNldCAtIGlucHV0LCAnbScpLCAxLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldCh0aGlzLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NoYW5nZUluUHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyBvZmZzZXQgOiB0aGlzLl9kLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB6b25lQWJiciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/IFwiVVRDXCIgOiBcIlwiO1xuICAgICAgICB9LFxuXG4gICAgICAgIHpvbmVOYW1lIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gXCJDb29yZGluYXRlZCBVbml2ZXJzYWwgVGltZVwiIDogXCJcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzZVpvbmUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdHptKSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b25lKHRoaXMuX3R6bSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLl9pID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuem9uZSh0aGlzLl9pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhc0FsaWduZWRIb3VyT2Zmc2V0IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICBpZiAoIWlucHV0KSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBtb21lbnQoaW5wdXQpLnpvbmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnpvbmUoKSAtIGlucHV0KSAlIDYwID09PSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRheXNJbk1vbnRoIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRheXNJbk1vbnRoKHRoaXMueWVhcigpLCB0aGlzLm1vbnRoKCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRheU9mWWVhciA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgdmFyIGRheU9mWWVhciA9IHJvdW5kKChtb21lbnQodGhpcykuc3RhcnRPZignZGF5JykgLSBtb21lbnQodGhpcykuc3RhcnRPZigneWVhcicpKSAvIDg2NGU1KSArIDE7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IGRheU9mWWVhciA6IHRoaXMuYWRkKFwiZFwiLCAoaW5wdXQgLSBkYXlPZlllYXIpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBxdWFydGVyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IE1hdGguY2VpbCgodGhpcy5tb250aCgpICsgMSkgLyAzKSA6IHRoaXMubW9udGgoKGlucHV0IC0gMSkgKiAzICsgdGhpcy5tb250aCgpICUgMyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla1llYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCB0aGlzLmxhbmcoKS5fd2Vlay5kb3csIHRoaXMubGFuZygpLl93ZWVrLmRveSkueWVhcjtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8geWVhciA6IHRoaXMuYWRkKFwieVwiLCAoaW5wdXQgLSB5ZWFyKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNvV2Vla1llYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCAxLCA0KS55ZWFyO1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB5ZWFyIDogdGhpcy5hZGQoXCJ5XCIsIChpbnB1dCAtIHllYXIpKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgd2VlayA9IHRoaXMubGFuZygpLndlZWsodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWsgOiB0aGlzLmFkZChcImRcIiwgKGlucHV0IC0gd2VlaykgKiA3KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgd2VlayA9IHdlZWtPZlllYXIodGhpcywgMSwgNCkud2VlaztcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2VlayA6IHRoaXMuYWRkKFwiZFwiLCAoaW5wdXQgLSB3ZWVrKSAqIDcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrZGF5ID0gKHRoaXMuZGF5KCkgKyA3IC0gdGhpcy5sYW5nKCkuX3dlZWsuZG93KSAlIDc7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHdlZWtkYXkgOiB0aGlzLmFkZChcImRcIiwgaW5wdXQgLSB3ZWVrZGF5KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAvLyBiZWhhdmVzIHRoZSBzYW1lIGFzIG1vbWVudCNkYXkgZXhjZXB0XG4gICAgICAgICAgICAvLyBhcyBhIGdldHRlciwgcmV0dXJucyA3IGluc3RlYWQgb2YgMCAoMS03IHJhbmdlIGluc3RlYWQgb2YgMC02KVxuICAgICAgICAgICAgLy8gYXMgYSBzZXR0ZXIsIHN1bmRheSBzaG91bGQgYmVsb25nIHRvIHRoZSBwcmV2aW91cyB3ZWVrLlxuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB0aGlzLmRheSgpIHx8IDcgOiB0aGlzLmRheSh0aGlzLmRheSgpICUgNyA/IGlucHV0IDogaW5wdXQgLSA3KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrc0luWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB3ZWVrc0luWWVhcih0aGlzLnllYXIoKSwgMSwgNCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla3NJblllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgd2Vla0luZm8gPSB0aGlzLl9sYW5nLl93ZWVrO1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtzSW5ZZWFyKHRoaXMueWVhcigpLCB3ZWVrSW5mby5kb3csIHdlZWtJbmZvLmRveSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0IDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW3VuaXRzXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldCA6IGZ1bmN0aW9uICh1bml0cywgdmFsdWUpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzW3VuaXRzXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRoaXNbdW5pdHNdKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIElmIHBhc3NlZCBhIGxhbmd1YWdlIGtleSwgaXQgd2lsbCBzZXQgdGhlIGxhbmd1YWdlIGZvciB0aGlzXG4gICAgICAgIC8vIGluc3RhbmNlLiAgT3RoZXJ3aXNlLCBpdCB3aWxsIHJldHVybiB0aGUgbGFuZ3VhZ2UgY29uZmlndXJhdGlvblxuICAgICAgICAvLyB2YXJpYWJsZXMgZm9yIHRoaXMgaW5zdGFuY2UuXG4gICAgICAgIGxhbmcgOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fbGFuZztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbGFuZyA9IGdldExhbmdEZWZpbml0aW9uKGtleSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHJhd01vbnRoU2V0dGVyKG1vbSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGRheU9mTW9udGg7XG5cbiAgICAgICAgLy8gVE9ETzogTW92ZSB0aGlzIG91dCBvZiBoZXJlIVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWUgPSBtb20ubGFuZygpLm1vbnRoc1BhcnNlKHZhbHVlKTtcbiAgICAgICAgICAgIC8vIFRPRE86IEFub3RoZXIgc2lsZW50IGZhaWx1cmU/XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb207XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkYXlPZk1vbnRoID0gTWF0aC5taW4obW9tLmRhdGUoKSxcbiAgICAgICAgICAgICAgICBkYXlzSW5Nb250aChtb20ueWVhcigpLCB2YWx1ZSkpO1xuICAgICAgICBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgJ01vbnRoJ10odmFsdWUsIGRheU9mTW9udGgpO1xuICAgICAgICByZXR1cm4gbW9tO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhd0dldHRlcihtb20sIHVuaXQpIHtcbiAgICAgICAgcmV0dXJuIG1vbS5fZFsnZ2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhd1NldHRlcihtb20sIHVuaXQsIHZhbHVlKSB7XG4gICAgICAgIGlmICh1bml0ID09PSAnTW9udGgnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmF3TW9udGhTZXR0ZXIobW9tLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tLl9kWydzZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArIHVuaXRdKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VBY2Nlc3Nvcih1bml0LCBrZWVwVGltZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJhd1NldHRlcih0aGlzLCB1bml0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldCh0aGlzLCBrZWVwVGltZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiByYXdHZXR0ZXIodGhpcywgdW5pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgbW9tZW50LmZuLm1pbGxpc2Vjb25kID0gbW9tZW50LmZuLm1pbGxpc2Vjb25kcyA9IG1ha2VBY2Nlc3NvcignTWlsbGlzZWNvbmRzJywgZmFsc2UpO1xuICAgIG1vbWVudC5mbi5zZWNvbmQgPSBtb21lbnQuZm4uc2Vjb25kcyA9IG1ha2VBY2Nlc3NvcignU2Vjb25kcycsIGZhbHNlKTtcbiAgICBtb21lbnQuZm4ubWludXRlID0gbW9tZW50LmZuLm1pbnV0ZXMgPSBtYWtlQWNjZXNzb3IoJ01pbnV0ZXMnLCBmYWxzZSk7XG4gICAgLy8gU2V0dGluZyB0aGUgaG91ciBzaG91bGQga2VlcCB0aGUgdGltZSwgYmVjYXVzZSB0aGUgdXNlciBleHBsaWNpdGx5XG4gICAgLy8gc3BlY2lmaWVkIHdoaWNoIGhvdXIgaGUgd2FudHMuIFNvIHRyeWluZyB0byBtYWludGFpbiB0aGUgc2FtZSBob3VyIChpblxuICAgIC8vIGEgbmV3IHRpbWV6b25lKSBtYWtlcyBzZW5zZS4gQWRkaW5nL3N1YnRyYWN0aW5nIGhvdXJzIGRvZXMgbm90IGZvbGxvd1xuICAgIC8vIHRoaXMgcnVsZS5cbiAgICBtb21lbnQuZm4uaG91ciA9IG1vbWVudC5mbi5ob3VycyA9IG1ha2VBY2Nlc3NvcignSG91cnMnLCB0cnVlKTtcbiAgICAvLyBtb21lbnQuZm4ubW9udGggaXMgZGVmaW5lZCBzZXBhcmF0ZWx5XG4gICAgbW9tZW50LmZuLmRhdGUgPSBtYWtlQWNjZXNzb3IoJ0RhdGUnLCB0cnVlKTtcbiAgICBtb21lbnQuZm4uZGF0ZXMgPSBkZXByZWNhdGUoXCJkYXRlcyBhY2Nlc3NvciBpcyBkZXByZWNhdGVkLiBVc2UgZGF0ZSBpbnN0ZWFkLlwiLCBtYWtlQWNjZXNzb3IoJ0RhdGUnLCB0cnVlKSk7XG4gICAgbW9tZW50LmZuLnllYXIgPSBtYWtlQWNjZXNzb3IoJ0Z1bGxZZWFyJywgdHJ1ZSk7XG4gICAgbW9tZW50LmZuLnllYXJzID0gZGVwcmVjYXRlKFwieWVhcnMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIHllYXIgaW5zdGVhZC5cIiwgbWFrZUFjY2Vzc29yKCdGdWxsWWVhcicsIHRydWUpKTtcblxuICAgIC8vIGFkZCBwbHVyYWwgbWV0aG9kc1xuICAgIG1vbWVudC5mbi5kYXlzID0gbW9tZW50LmZuLmRheTtcbiAgICBtb21lbnQuZm4ubW9udGhzID0gbW9tZW50LmZuLm1vbnRoO1xuICAgIG1vbWVudC5mbi53ZWVrcyA9IG1vbWVudC5mbi53ZWVrO1xuICAgIG1vbWVudC5mbi5pc29XZWVrcyA9IG1vbWVudC5mbi5pc29XZWVrO1xuICAgIG1vbWVudC5mbi5xdWFydGVycyA9IG1vbWVudC5mbi5xdWFydGVyO1xuXG4gICAgLy8gYWRkIGFsaWFzZWQgZm9ybWF0IG1ldGhvZHNcbiAgICBtb21lbnQuZm4udG9KU09OID0gbW9tZW50LmZuLnRvSVNPU3RyaW5nO1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEdXJhdGlvbiBQcm90b3R5cGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGV4dGVuZChtb21lbnQuZHVyYXRpb24uZm4gPSBEdXJhdGlvbi5wcm90b3R5cGUsIHtcblxuICAgICAgICBfYnViYmxlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgICAgICBkYXlzID0gdGhpcy5fZGF5cyxcbiAgICAgICAgICAgICAgICBtb250aHMgPSB0aGlzLl9tb250aHMsXG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuX2RhdGEsXG4gICAgICAgICAgICAgICAgc2Vjb25kcywgbWludXRlcywgaG91cnMsIHllYXJzO1xuXG4gICAgICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGNvZGUgYnViYmxlcyB1cCB2YWx1ZXMsIHNlZSB0aGUgdGVzdHMgZm9yXG4gICAgICAgICAgICAvLyBleGFtcGxlcyBvZiB3aGF0IHRoYXQgbWVhbnMuXG4gICAgICAgICAgICBkYXRhLm1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kcyAlIDEwMDA7XG5cbiAgICAgICAgICAgIHNlY29uZHMgPSBhYnNSb3VuZChtaWxsaXNlY29uZHMgLyAxMDAwKTtcbiAgICAgICAgICAgIGRhdGEuc2Vjb25kcyA9IHNlY29uZHMgJSA2MDtcblxuICAgICAgICAgICAgbWludXRlcyA9IGFic1JvdW5kKHNlY29uZHMgLyA2MCk7XG4gICAgICAgICAgICBkYXRhLm1pbnV0ZXMgPSBtaW51dGVzICUgNjA7XG5cbiAgICAgICAgICAgIGhvdXJzID0gYWJzUm91bmQobWludXRlcyAvIDYwKTtcbiAgICAgICAgICAgIGRhdGEuaG91cnMgPSBob3VycyAlIDI0O1xuXG4gICAgICAgICAgICBkYXlzICs9IGFic1JvdW5kKGhvdXJzIC8gMjQpO1xuICAgICAgICAgICAgZGF0YS5kYXlzID0gZGF5cyAlIDMwO1xuXG4gICAgICAgICAgICBtb250aHMgKz0gYWJzUm91bmQoZGF5cyAvIDMwKTtcbiAgICAgICAgICAgIGRhdGEubW9udGhzID0gbW9udGhzICUgMTI7XG5cbiAgICAgICAgICAgIHllYXJzID0gYWJzUm91bmQobW9udGhzIC8gMTIpO1xuICAgICAgICAgICAgZGF0YS55ZWFycyA9IHllYXJzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWtzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFic1JvdW5kKHRoaXMuZGF5cygpIC8gNyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdmFsdWVPZiA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9taWxsaXNlY29uZHMgK1xuICAgICAgICAgICAgICB0aGlzLl9kYXlzICogODY0ZTUgK1xuICAgICAgICAgICAgICAodGhpcy5fbW9udGhzICUgMTIpICogMjU5MmU2ICtcbiAgICAgICAgICAgICAgdG9JbnQodGhpcy5fbW9udGhzIC8gMTIpICogMzE1MzZlNjtcbiAgICAgICAgfSxcblxuICAgICAgICBodW1hbml6ZSA6IGZ1bmN0aW9uICh3aXRoU3VmZml4KSB7XG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9ICt0aGlzLFxuICAgICAgICAgICAgICAgIG91dHB1dCA9IHJlbGF0aXZlVGltZShkaWZmZXJlbmNlLCAhd2l0aFN1ZmZpeCwgdGhpcy5sYW5nKCkpO1xuXG4gICAgICAgICAgICBpZiAod2l0aFN1ZmZpeCkge1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHRoaXMubGFuZygpLnBhc3RGdXR1cmUoZGlmZmVyZW5jZSwgb3V0cHV0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGFuZygpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgLy8gc3VwcG9ydHMgb25seSAyLjAtc3R5bGUgYWRkKDEsICdzJykgb3IgYWRkKG1vbWVudClcbiAgICAgICAgICAgIHZhciBkdXIgPSBtb21lbnQuZHVyYXRpb24oaW5wdXQsIHZhbCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21pbGxpc2Vjb25kcyArPSBkdXIuX21pbGxpc2Vjb25kcztcbiAgICAgICAgICAgIHRoaXMuX2RheXMgKz0gZHVyLl9kYXlzO1xuICAgICAgICAgICAgdGhpcy5fbW9udGhzICs9IGR1ci5fbW9udGhzO1xuXG4gICAgICAgICAgICB0aGlzLl9idWJibGUoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3VidHJhY3QgOiBmdW5jdGlvbiAoaW5wdXQsIHZhbCkge1xuICAgICAgICAgICAgdmFyIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcblxuICAgICAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzIC09IGR1ci5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyAtPSBkdXIuX2RheXM7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgLT0gZHVyLl9tb250aHM7XG5cbiAgICAgICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgOiBmdW5jdGlvbiAodW5pdHMpIHtcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbdW5pdHMudG9Mb3dlckNhc2UoKSArICdzJ10oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhcyA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1snYXMnICsgdW5pdHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB1bml0cy5zbGljZSgxKSArICdzJ10oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsYW5nIDogbW9tZW50LmZuLmxhbmcsXG5cbiAgICAgICAgdG9Jc29TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBpbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vZG9yZGlsbGUvbW9tZW50LWlzb2R1cmF0aW9uL2Jsb2IvbWFzdGVyL21vbWVudC5pc29kdXJhdGlvbi5qc1xuICAgICAgICAgICAgdmFyIHllYXJzID0gTWF0aC5hYnModGhpcy55ZWFycygpKSxcbiAgICAgICAgICAgICAgICBtb250aHMgPSBNYXRoLmFicyh0aGlzLm1vbnRocygpKSxcbiAgICAgICAgICAgICAgICBkYXlzID0gTWF0aC5hYnModGhpcy5kYXlzKCkpLFxuICAgICAgICAgICAgICAgIGhvdXJzID0gTWF0aC5hYnModGhpcy5ob3VycygpKSxcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gTWF0aC5hYnModGhpcy5taW51dGVzKCkpLFxuICAgICAgICAgICAgICAgIHNlY29uZHMgPSBNYXRoLmFicyh0aGlzLnNlY29uZHMoKSArIHRoaXMubWlsbGlzZWNvbmRzKCkgLyAxMDAwKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmFzU2Vjb25kcygpKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyB0aGUgc2FtZSBhcyBDIydzIChOb2RhKSBhbmQgcHl0aG9uIChpc29kYXRlKS4uLlxuICAgICAgICAgICAgICAgIC8vIGJ1dCBub3Qgb3RoZXIgSlMgKGdvb2cuZGF0ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1AwRCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAodGhpcy5hc1NlY29uZHMoKSA8IDAgPyAnLScgOiAnJykgK1xuICAgICAgICAgICAgICAgICdQJyArXG4gICAgICAgICAgICAgICAgKHllYXJzID8geWVhcnMgKyAnWScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChtb250aHMgPyBtb250aHMgKyAnTScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChkYXlzID8gZGF5cyArICdEJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKChob3VycyB8fCBtaW51dGVzIHx8IHNlY29uZHMpID8gJ1QnIDogJycpICtcbiAgICAgICAgICAgICAgICAoaG91cnMgPyBob3VycyArICdIJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKG1pbnV0ZXMgPyBtaW51dGVzICsgJ00nIDogJycpICtcbiAgICAgICAgICAgICAgICAoc2Vjb25kcyA/IHNlY29uZHMgKyAnUycgOiAnJyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIG1ha2VEdXJhdGlvbkdldHRlcihuYW1lKSB7XG4gICAgICAgIG1vbWVudC5kdXJhdGlvbi5mbltuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kYXRhW25hbWVdO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VEdXJhdGlvbkFzR2V0dGVyKG5hbWUsIGZhY3Rvcikge1xuICAgICAgICBtb21lbnQuZHVyYXRpb24uZm5bJ2FzJyArIG5hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzIC8gZmFjdG9yO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZvciAoaSBpbiB1bml0TWlsbGlzZWNvbmRGYWN0b3JzKSB7XG4gICAgICAgIGlmICh1bml0TWlsbGlzZWNvbmRGYWN0b3JzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBtYWtlRHVyYXRpb25Bc0dldHRlcihpLCB1bml0TWlsbGlzZWNvbmRGYWN0b3JzW2ldKTtcbiAgICAgICAgICAgIG1ha2VEdXJhdGlvbkdldHRlcihpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbWFrZUR1cmF0aW9uQXNHZXR0ZXIoJ1dlZWtzJywgNjA0OGU1KTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNb250aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoK3RoaXMgLSB0aGlzLnllYXJzKCkgKiAzMTUzNmU2KSAvIDI1OTJlNiArIHRoaXMueWVhcnMoKSAqIDEyO1xuICAgIH07XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRGVmYXVsdCBMYW5nXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAvLyBTZXQgZGVmYXVsdCBsYW5ndWFnZSwgb3RoZXIgbGFuZ3VhZ2VzIHdpbGwgaW5oZXJpdCBmcm9tIEVuZ2xpc2guXG4gICAgbW9tZW50LmxhbmcoJ2VuJywge1xuICAgICAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICAgICAgdmFyIGIgPSBudW1iZXIgJSAxMCxcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSAodG9JbnQobnVtYmVyICUgMTAwIC8gMTApID09PSAxKSA/ICd0aCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAxKSA/ICdzdCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAyKSA/ICduZCcgOlxuICAgICAgICAgICAgICAgIChiID09PSAzKSA/ICdyZCcgOiAndGgnO1xuICAgICAgICAgICAgcmV0dXJuIG51bWJlciArIG91dHB1dDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyogRU1CRURfTEFOR1VBR0VTICovXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEV4cG9zaW5nIE1vbWVudFxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIGZ1bmN0aW9uIG1ha2VHbG9iYWwoc2hvdWxkRGVwcmVjYXRlKSB7XG4gICAgICAgIC8qZ2xvYmFsIGVuZGVyOmZhbHNlICovXG4gICAgICAgIGlmICh0eXBlb2YgZW5kZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb2xkR2xvYmFsTW9tZW50ID0gZ2xvYmFsU2NvcGUubW9tZW50O1xuICAgICAgICBpZiAoc2hvdWxkRGVwcmVjYXRlKSB7XG4gICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBkZXByZWNhdGUoXG4gICAgICAgICAgICAgICAgICAgIFwiQWNjZXNzaW5nIE1vbWVudCB0aHJvdWdoIHRoZSBnbG9iYWwgc2NvcGUgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICBcImRlcHJlY2F0ZWQsIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYW4gdXBjb21pbmcgXCIgK1xuICAgICAgICAgICAgICAgICAgICBcInJlbGVhc2UuXCIsXG4gICAgICAgICAgICAgICAgICAgIG1vbWVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnbG9iYWxTY29wZS5tb21lbnQgPSBtb21lbnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb21tb25KUyBtb2R1bGUgaXMgZGVmaW5lZFxuICAgIGlmIChoYXNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBtb21lbnQ7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoXCJtb21lbnRcIiwgZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuICAgICAgICAgICAgaWYgKG1vZHVsZS5jb25maWcgJiYgbW9kdWxlLmNvbmZpZygpICYmIG1vZHVsZS5jb25maWcoKS5ub0dsb2JhbCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgdGhlIGdsb2JhbCB2YXJpYWJsZVxuICAgICAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG9sZEdsb2JhbE1vbWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG1vbWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1ha2VHbG9iYWwodHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWFrZUdsb2JhbCgpO1xuICAgIH1cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4yXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBkZXByZWNhdGUsIGhhc01vZHVsZSwgbWFrZVR3aXgsXG4gICAgX19zbGljZSA9IFtdLnNsaWNlO1xuXG4gIGhhc01vZHVsZSA9ICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZSAhPT0gbnVsbCkgJiYgKG1vZHVsZS5leHBvcnRzICE9IG51bGwpO1xuXG4gIGRlcHJlY2F0ZSA9IGZ1bmN0aW9uKG5hbWUsIGluc3RlYWQsIGZuKSB7XG4gICAgdmFyIGFscmVhZHlEb25lO1xuXG4gICAgYWxyZWFkeURvbmUgPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncztcblxuICAgICAgYXJncyA9IDEgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgICBpZiAoIWFscmVhZHlEb25lKSB7XG4gICAgICAgIGlmICgodHlwZW9mIGNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIgJiYgY29uc29sZSAhPT0gbnVsbCkgJiYgKGNvbnNvbGUud2FybiAhPSBudWxsKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIiNcIiArIG5hbWUgKyBcIiBpcyBkZXByZWNhdGVkLiBVc2UgI1wiICsgaW5zdGVhZCArIFwiIGluc3RlYWQuXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhbHJlYWR5RG9uZSA9IHRydWU7XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICBtYWtlVHdpeCA9IGZ1bmN0aW9uKG1vbWVudCkge1xuICAgIHZhciBUd2l4LCBnZXRQcm90b3R5cGVPZiwgbGFuZ3VhZ2VzTG9hZGVkO1xuXG4gICAgaWYgKG1vbWVudCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBcIkNhbid0IGZpbmQgbW9tZW50XCI7XG4gICAgfVxuICAgIGxhbmd1YWdlc0xvYWRlZCA9IGZhbHNlO1xuICAgIFR3aXggPSAoZnVuY3Rpb24oKSB7XG4gICAgICBmdW5jdGlvbiBUd2l4KHN0YXJ0LCBlbmQsIHBhcnNlRm9ybWF0LCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBfcmVmO1xuXG4gICAgICAgIGlmIChvcHRpb25zID09IG51bGwpIHtcbiAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBwYXJzZUZvcm1hdCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIG9wdGlvbnMgPSBwYXJzZUZvcm1hdCAhPSBudWxsID8gcGFyc2VGb3JtYXQgOiB7fTtcbiAgICAgICAgICBwYXJzZUZvcm1hdCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImJvb2xlYW5cIikge1xuICAgICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBhbGxEYXk6IG9wdGlvbnNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhcnQgPSBtb21lbnQoc3RhcnQsIHBhcnNlRm9ybWF0LCBvcHRpb25zLnBhcnNlU3RyaWN0KTtcbiAgICAgICAgdGhpcy5lbmQgPSBtb21lbnQoZW5kLCBwYXJzZUZvcm1hdCwgb3B0aW9ucy5wYXJzZVN0cmljdCk7XG4gICAgICAgIHRoaXMuYWxsRGF5ID0gKF9yZWYgPSBvcHRpb25zLmFsbERheSkgIT0gbnVsbCA/IF9yZWYgOiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgVHdpeC5fZXh0ZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhdHRyLCBmaXJzdCwgb3RoZXIsIG90aGVycywgX2ksIF9sZW47XG5cbiAgICAgICAgZmlyc3QgPSBhcmd1bWVudHNbMF0sIG90aGVycyA9IDIgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gICAgICAgIGZvciAoX2kgPSAwLCBfbGVuID0gb3RoZXJzLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICAgICAgb3RoZXIgPSBvdGhlcnNbX2ldO1xuICAgICAgICAgIGZvciAoYXR0ciBpbiBvdGhlcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvdGhlclthdHRyXSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICBmaXJzdFthdHRyXSA9IG90aGVyW2F0dHJdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlyc3Q7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LmRlZmF1bHRzID0ge1xuICAgICAgICB0d2VudHlGb3VySG91cjogZmFsc2UsXG4gICAgICAgIGFsbERheVNpbXBsZToge1xuICAgICAgICAgIGZuOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmFsbERheTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzbG90OiAwLFxuICAgICAgICAgIHByZTogXCIgXCJcbiAgICAgICAgfSxcbiAgICAgICAgZGF5T2ZXZWVrOiB7XG4gICAgICAgICAgZm46IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkYXRlLmZvcm1hdChvcHRpb25zLndlZWtkYXlGb3JtYXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNsb3Q6IDEsXG4gICAgICAgICAgcHJlOiBcIiBcIlxuICAgICAgICB9LFxuICAgICAgICBhbGxEYXlNb250aDoge1xuICAgICAgICAgIGZuOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZGF0ZS5mb3JtYXQoXCJcIiArIG9wdGlvbnMubW9udGhGb3JtYXQgKyBcIiBcIiArIG9wdGlvbnMuZGF5Rm9ybWF0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSxcbiAgICAgICAgICBzbG90OiAyLFxuICAgICAgICAgIHByZTogXCIgXCJcbiAgICAgICAgfSxcbiAgICAgICAgbW9udGg6IHtcbiAgICAgICAgICBmbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZm9ybWF0KG9wdGlvbnMubW9udGhGb3JtYXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNsb3Q6IDIsXG4gICAgICAgICAgcHJlOiBcIiBcIlxuICAgICAgICB9LFxuICAgICAgICBkYXRlOiB7XG4gICAgICAgICAgZm46IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkYXRlLmZvcm1hdChvcHRpb25zLmRheUZvcm1hdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2xvdDogMyxcbiAgICAgICAgICBwcmU6IFwiIFwiXG4gICAgICAgIH0sXG4gICAgICAgIHllYXI6IHtcbiAgICAgICAgICBmbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGUuZm9ybWF0KG9wdGlvbnMueWVhckZvcm1hdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2xvdDogNCxcbiAgICAgICAgICBwcmU6IFwiLCBcIlxuICAgICAgICB9LFxuICAgICAgICB0aW1lOiB7XG4gICAgICAgICAgZm46IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgICAgICAgIHZhciBzdHI7XG5cbiAgICAgICAgICAgICAgc3RyID0gZGF0ZS5taW51dGVzKCkgPT09IDAgJiYgb3B0aW9ucy5pbXBsaWNpdE1pbnV0ZXMgJiYgIW9wdGlvbnMudHdlbnR5Rm91ckhvdXIgPyBkYXRlLmZvcm1hdChvcHRpb25zLmhvdXJGb3JtYXQpIDogZGF0ZS5mb3JtYXQoXCJcIiArIG9wdGlvbnMuaG91ckZvcm1hdCArIFwiOlwiICsgb3B0aW9ucy5taW51dGVGb3JtYXQpO1xuICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMuZ3JvdXBNZXJpZGllbXMgJiYgIW9wdGlvbnMudHdlbnR5Rm91ckhvdXIpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5zcGFjZUJlZm9yZU1lcmlkaWVtKSB7XG4gICAgICAgICAgICAgICAgICBzdHIgKz0gXCIgXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0ciArPSBkYXRlLmZvcm1hdChvcHRpb25zLm1lcmlkaWVtRm9ybWF0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNsb3Q6IDUsXG4gICAgICAgICAgcHJlOiBcIiwgXCJcbiAgICAgICAgfSxcbiAgICAgICAgbWVyaWRpZW06IHtcbiAgICAgICAgICBmbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHQuZm9ybWF0KG9wdGlvbnMubWVyaWRpZW1Gb3JtYXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNsb3Q6IDYsXG4gICAgICAgICAgcHJlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zcGFjZUJlZm9yZU1lcmlkaWVtKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIiBcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5yZWdpc3RlckxhbmcgPSBmdW5jdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBtb21lbnQubGFuZyhuYW1lLCB7XG4gICAgICAgICAgdHdpeDogVHdpeC5fZXh0ZW5kKHt9LCBUd2l4LmRlZmF1bHRzLCBvcHRpb25zKVxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmlzU2FtZSA9IGZ1bmN0aW9uKHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGFydC5pc1NhbWUodGhpcy5lbmQsIHBlcmlvZCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbihwZXJpb2QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RydWVFbmQodHJ1ZSkuZGlmZih0aGlzLl90cnVlU3RhcnQoKSwgcGVyaW9kKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmNvdW50ID0gZnVuY3Rpb24ocGVyaW9kKSB7XG4gICAgICAgIHZhciBlbmQsIHN0YXJ0O1xuXG4gICAgICAgIHN0YXJ0ID0gdGhpcy5zdGFydC5jbG9uZSgpLnN0YXJ0T2YocGVyaW9kKTtcbiAgICAgICAgZW5kID0gdGhpcy5lbmQuY2xvbmUoKS5zdGFydE9mKHBlcmlvZCk7XG4gICAgICAgIHJldHVybiBlbmQuZGlmZihzdGFydCwgcGVyaW9kKSArIDE7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5jb3VudElubmVyID0gZnVuY3Rpb24ocGVyaW9kKSB7XG4gICAgICAgIHZhciBlbmQsIHN0YXJ0LCBfcmVmO1xuXG4gICAgICAgIF9yZWYgPSB0aGlzLl9pbm5lcihwZXJpb2QpLCBzdGFydCA9IF9yZWZbMF0sIGVuZCA9IF9yZWZbMV07XG4gICAgICAgIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW5kLmRpZmYoc3RhcnQsIHBlcmlvZCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5pdGVyYXRlID0gZnVuY3Rpb24oaW50ZXJ2YWxBbW91bnQsIHBlcmlvZCwgbWluSG91cnMpIHtcbiAgICAgICAgdmFyIGVuZCwgaGFzTmV4dCwgc3RhcnQsIF9yZWYsXG4gICAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIGlmIChpbnRlcnZhbEFtb3VudCA9PSBudWxsKSB7XG4gICAgICAgICAgaW50ZXJ2YWxBbW91bnQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIF9yZWYgPSB0aGlzLl9wcmVwSXRlcmF0ZUlucHV0cyhpbnRlcnZhbEFtb3VudCwgcGVyaW9kLCBtaW5Ib3VycyksIGludGVydmFsQW1vdW50ID0gX3JlZlswXSwgcGVyaW9kID0gX3JlZlsxXSwgbWluSG91cnMgPSBfcmVmWzJdO1xuICAgICAgICBzdGFydCA9IHRoaXMuc3RhcnQuY2xvbmUoKS5zdGFydE9mKHBlcmlvZCk7XG4gICAgICAgIGVuZCA9IHRoaXMuZW5kLmNsb25lKCkuc3RhcnRPZihwZXJpb2QpO1xuICAgICAgICBoYXNOZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHN0YXJ0IDw9IGVuZCAmJiAoIW1pbkhvdXJzIHx8IHN0YXJ0LnZhbHVlT2YoKSAhPT0gZW5kLnZhbHVlT2YoKSB8fCBfdGhpcy5lbmQuaG91cnMoKSA+IG1pbkhvdXJzIHx8IF90aGlzLmFsbERheSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVyYXRlSGVscGVyKHBlcmlvZCwgc3RhcnQsIGhhc05leHQsIGludGVydmFsQW1vdW50KTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLml0ZXJhdGVJbm5lciA9IGZ1bmN0aW9uKGludGVydmFsQW1vdW50LCBwZXJpb2QpIHtcbiAgICAgICAgdmFyIGVuZCwgaGFzTmV4dCwgc3RhcnQsIF9yZWYsIF9yZWYxO1xuXG4gICAgICAgIGlmIChpbnRlcnZhbEFtb3VudCA9PSBudWxsKSB7XG4gICAgICAgICAgaW50ZXJ2YWxBbW91bnQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIF9yZWYgPSB0aGlzLl9wcmVwSXRlcmF0ZUlucHV0cyhpbnRlcnZhbEFtb3VudCwgcGVyaW9kKSwgaW50ZXJ2YWxBbW91bnQgPSBfcmVmWzBdLCBwZXJpb2QgPSBfcmVmWzFdO1xuICAgICAgICBfcmVmMSA9IHRoaXMuX2lubmVyKHBlcmlvZCwgaW50ZXJ2YWxBbW91bnQpLCBzdGFydCA9IF9yZWYxWzBdLCBlbmQgPSBfcmVmMVsxXTtcbiAgICAgICAgaGFzTmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBzdGFydCA8IGVuZDtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZXJhdGVIZWxwZXIocGVyaW9kLCBzdGFydCwgaGFzTmV4dCwgaW50ZXJ2YWxBbW91bnQpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuaHVtYW5pemVMZW5ndGggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNTYW1lKFwiZGF5XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhbGwgZGF5XCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0LmZyb20odGhpcy5lbmQuY2xvbmUoKS5hZGQoMSwgXCJkYXlcIiksIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zdGFydC5mcm9tKHRoaXMuZW5kLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuYXNEdXJhdGlvbiA9IGZ1bmN0aW9uKHVuaXRzKSB7XG4gICAgICAgIHZhciBkaWZmO1xuXG4gICAgICAgIGRpZmYgPSB0aGlzLmVuZC5kaWZmKHRoaXMuc3RhcnQpO1xuICAgICAgICByZXR1cm4gbW9tZW50LmR1cmF0aW9uKGRpZmYpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuaXNQYXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbERheSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmVuZC5jbG9uZSgpLmVuZE9mKFwiZGF5XCIpIDwgbW9tZW50KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZW5kIDwgbW9tZW50KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmlzRnV0dXJlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbERheSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0LmNsb25lKCkuc3RhcnRPZihcImRheVwiKSA+IG1vbWVudCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLnN0YXJ0ID4gbW9tZW50KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmlzQ3VycmVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuaXNQYXN0KCkgJiYgIXRoaXMuaXNGdXR1cmUoKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24obW9tKSB7XG4gICAgICAgIG1vbSA9IG1vbWVudChtb20pO1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJ1ZVN0YXJ0KCkgPD0gbW9tICYmIHRoaXMuX3RydWVFbmQoKSA+PSBtb207XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5pc0VtcHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cnVlU3RhcnQoKS52YWx1ZU9mKCkgPT09IHRoaXMuX3RydWVFbmQoKS52YWx1ZU9mKCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5vdmVybGFwcyA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cnVlRW5kKCkuaXNBZnRlcihvdGhlci5fdHJ1ZVN0YXJ0KCkpICYmIHRoaXMuX3RydWVTdGFydCgpLmlzQmVmb3JlKG90aGVyLl90cnVlRW5kKCkpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuZW5ndWxmcyA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cnVlU3RhcnQoKSA8PSBvdGhlci5fdHJ1ZVN0YXJ0KCkgJiYgdGhpcy5fdHJ1ZUVuZCgpID49IG90aGVyLl90cnVlRW5kKCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS51bmlvbiA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHZhciBhbGxEYXksIG5ld0VuZCwgbmV3U3RhcnQ7XG5cbiAgICAgICAgYWxsRGF5ID0gdGhpcy5hbGxEYXkgJiYgb3RoZXIuYWxsRGF5O1xuICAgICAgICBpZiAoYWxsRGF5KSB7XG4gICAgICAgICAgbmV3U3RhcnQgPSB0aGlzLnN0YXJ0IDwgb3RoZXIuc3RhcnQgPyB0aGlzLnN0YXJ0IDogb3RoZXIuc3RhcnQ7XG4gICAgICAgICAgbmV3RW5kID0gdGhpcy5lbmQgPiBvdGhlci5lbmQgPyB0aGlzLmVuZCA6IG90aGVyLmVuZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdTdGFydCA9IHRoaXMuX3RydWVTdGFydCgpIDwgb3RoZXIuX3RydWVTdGFydCgpID8gdGhpcy5fdHJ1ZVN0YXJ0KCkgOiBvdGhlci5fdHJ1ZVN0YXJ0KCk7XG4gICAgICAgICAgbmV3RW5kID0gdGhpcy5fdHJ1ZUVuZCgpID4gb3RoZXIuX3RydWVFbmQoKSA/IHRoaXMuX3RydWVFbmQoKSA6IG90aGVyLl90cnVlRW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBUd2l4KG5ld1N0YXJ0LCBuZXdFbmQsIGFsbERheSk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICB2YXIgYWxsRGF5LCBlbmQsIG5ld0VuZCwgbmV3U3RhcnQ7XG5cbiAgICAgICAgbmV3U3RhcnQgPSB0aGlzLnN0YXJ0ID4gb3RoZXIuc3RhcnQgPyB0aGlzLnN0YXJ0IDogb3RoZXIuc3RhcnQ7XG4gICAgICAgIGlmICh0aGlzLmFsbERheSkge1xuICAgICAgICAgIGVuZCA9IG1vbWVudCh0aGlzLmVuZCk7XG4gICAgICAgICAgZW5kLmFkZCgxLCBcImRheVwiKTtcbiAgICAgICAgICBlbmQuc3VidHJhY3QoMSwgXCJtaWxsaXNlY29uZFwiKTtcbiAgICAgICAgICBpZiAob3RoZXIuYWxsRGF5KSB7XG4gICAgICAgICAgICBuZXdFbmQgPSBlbmQgPCBvdGhlci5lbmQgPyB0aGlzLmVuZCA6IG90aGVyLmVuZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3RW5kID0gZW5kIDwgb3RoZXIuZW5kID8gZW5kIDogb3RoZXIuZW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdFbmQgPSB0aGlzLmVuZCA8IG90aGVyLmVuZCA/IHRoaXMuZW5kIDogb3RoZXIuZW5kO1xuICAgICAgICB9XG4gICAgICAgIGFsbERheSA9IHRoaXMuYWxsRGF5ICYmIG90aGVyLmFsbERheTtcbiAgICAgICAgcmV0dXJuIG5ldyBUd2l4KG5ld1N0YXJ0LCBuZXdFbmQsIGFsbERheSk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5pc1ZhbGlkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cnVlU3RhcnQoKSA8PSB0aGlzLl90cnVlRW5kKCk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gKG90aGVyIGluc3RhbmNlb2YgVHdpeCkgJiYgdGhpcy5hbGxEYXkgPT09IG90aGVyLmFsbERheSAmJiB0aGlzLnN0YXJ0LnZhbHVlT2YoKSA9PT0gb3RoZXIuc3RhcnQudmFsdWVPZigpICYmIHRoaXMuZW5kLnZhbHVlT2YoKSA9PT0gb3RoZXIuZW5kLnZhbHVlT2YoKTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfcmVmO1xuXG4gICAgICAgIHJldHVybiBcIntzdGFydDogXCIgKyAodGhpcy5zdGFydC5mb3JtYXQoKSkgKyBcIiwgZW5kOiBcIiArICh0aGlzLmVuZC5mb3JtYXQoKSkgKyBcIiwgYWxsRGF5OiBcIiArICgoX3JlZiA9IHRoaXMuYWxsRGF5KSAhPSBudWxsID8gX3JlZiA6IHtcbiAgICAgICAgICBcInRydWVcIjogXCJmYWxzZVwiXG4gICAgICAgIH0pICsgXCJ9XCI7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5zaW1wbGVGb3JtYXQgPSBmdW5jdGlvbihtb21lbnRPcHRzLCBpbm9wdHMpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMsIHM7XG5cbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICBhbGxEYXk6IFwiKGFsbCBkYXkpXCIsXG4gICAgICAgICAgdGVtcGxhdGU6IFR3aXguZm9ybWF0VGVtcGxhdGVcbiAgICAgICAgfTtcbiAgICAgICAgVHdpeC5fZXh0ZW5kKG9wdGlvbnMsIGlub3B0cyB8fCB7fSk7XG4gICAgICAgIHMgPSBvcHRpb25zLnRlbXBsYXRlKHRoaXMuc3RhcnQuZm9ybWF0KG1vbWVudE9wdHMpLCB0aGlzLmVuZC5mb3JtYXQobW9tZW50T3B0cykpO1xuICAgICAgICBpZiAodGhpcy5hbGxEYXkgJiYgb3B0aW9ucy5hbGxEYXkpIHtcbiAgICAgICAgICBzICs9IFwiIFwiICsgb3B0aW9ucy5hbGxEYXk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHM7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbihpbm9wdHMpIHtcbiAgICAgICAgdmFyIGNvbW1vbl9idWNrZXQsIGVuZF9idWNrZXQsIGZvbGQsIGZvcm1hdCwgZnMsIGdsb2JhbF9maXJzdCwgZ29lc0ludG9UaGVNb3JuaW5nLCBuZWVkRGF0ZSwgb3B0aW9ucywgcHJvY2Vzcywgc3RhcnRfYnVja2V0LCB0b2dldGhlciwgX2ksIF9sZW4sXG4gICAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMuX2xhenlMYW5nKCk7XG4gICAgICAgIGlmICh0aGlzLmlzRW1wdHkoKSkge1xuICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgZ3JvdXBNZXJpZGllbXM6IHRydWUsXG4gICAgICAgICAgc3BhY2VCZWZvcmVNZXJpZGllbTogdHJ1ZSxcbiAgICAgICAgICBzaG93RGF0ZTogdHJ1ZSxcbiAgICAgICAgICBzaG93RGF5T2ZXZWVrOiBmYWxzZSxcbiAgICAgICAgICB0d2VudHlGb3VySG91cjogdGhpcy5sYW5nRGF0YS50d2VudHlGb3VySG91cixcbiAgICAgICAgICBpbXBsaWNpdE1pbnV0ZXM6IHRydWUsXG4gICAgICAgICAgaW1wbGljaXRZZWFyOiB0cnVlLFxuICAgICAgICAgIHllYXJGb3JtYXQ6IFwiWVlZWVwiLFxuICAgICAgICAgIG1vbnRoRm9ybWF0OiBcIk1NTVwiLFxuICAgICAgICAgIHdlZWtkYXlGb3JtYXQ6IFwiZGRkXCIsXG4gICAgICAgICAgZGF5Rm9ybWF0OiBcIkRcIixcbiAgICAgICAgICBtZXJpZGllbUZvcm1hdDogXCJBXCIsXG4gICAgICAgICAgaG91ckZvcm1hdDogXCJoXCIsXG4gICAgICAgICAgbWludXRlRm9ybWF0OiBcIm1tXCIsXG4gICAgICAgICAgYWxsRGF5OiBcImFsbCBkYXlcIixcbiAgICAgICAgICBleHBsaWNpdEFsbERheTogZmFsc2UsXG4gICAgICAgICAgbGFzdE5pZ2h0RW5kc0F0OiAwLFxuICAgICAgICAgIHRlbXBsYXRlOiBUd2l4LmZvcm1hdFRlbXBsYXRlXG4gICAgICAgIH07XG4gICAgICAgIFR3aXguX2V4dGVuZChvcHRpb25zLCBpbm9wdHMgfHwge30pO1xuICAgICAgICBmcyA9IFtdO1xuICAgICAgICBpZiAob3B0aW9ucy50d2VudHlGb3VySG91cikge1xuICAgICAgICAgIG9wdGlvbnMuaG91ckZvcm1hdCA9IG9wdGlvbnMuaG91ckZvcm1hdC5yZXBsYWNlKFwiaFwiLCBcIkhcIik7XG4gICAgICAgIH1cbiAgICAgICAgZ29lc0ludG9UaGVNb3JuaW5nID0gb3B0aW9ucy5sYXN0TmlnaHRFbmRzQXQgPiAwICYmICF0aGlzLmFsbERheSAmJiB0aGlzLmVuZC5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIikudmFsdWVPZigpID09PSB0aGlzLnN0YXJ0LmNsb25lKCkuYWRkKDEsIFwiZGF5XCIpLnN0YXJ0T2YoXCJkYXlcIikudmFsdWVPZigpICYmIHRoaXMuc3RhcnQuaG91cnMoKSA+IDEyICYmIHRoaXMuZW5kLmhvdXJzKCkgPCBvcHRpb25zLmxhc3ROaWdodEVuZHNBdDtcbiAgICAgICAgbmVlZERhdGUgPSBvcHRpb25zLnNob3dEYXRlIHx8ICghdGhpcy5pc1NhbWUoXCJkYXlcIikgJiYgIWdvZXNJbnRvVGhlTW9ybmluZyk7XG4gICAgICAgIGlmICh0aGlzLmFsbERheSAmJiB0aGlzLmlzU2FtZShcImRheVwiKSAmJiAoIW9wdGlvbnMuc2hvd0RhdGUgfHwgb3B0aW9ucy5leHBsaWNpdEFsbERheSkpIHtcbiAgICAgICAgICBmcy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IFwiYWxsIGRheSBzaW1wbGVcIixcbiAgICAgICAgICAgIGZuOiB0aGlzLl9mb3JtYXRGbignYWxsRGF5U2ltcGxlJywgb3B0aW9ucyksXG4gICAgICAgICAgICBwcmU6IHRoaXMuX2Zvcm1hdFByZSgnYWxsRGF5U2ltcGxlJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCdhbGxEYXlTaW1wbGUnKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZWVkRGF0ZSAmJiAoIW9wdGlvbnMuaW1wbGljaXRZZWFyIHx8IHRoaXMuc3RhcnQueWVhcigpICE9PSBtb21lbnQoKS55ZWFyKCkgfHwgIXRoaXMuaXNTYW1lKFwieWVhclwiKSkpIHtcbiAgICAgICAgICBmcy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IFwieWVhclwiLFxuICAgICAgICAgICAgZm46IHRoaXMuX2Zvcm1hdEZuKCd5ZWFyJywgb3B0aW9ucyksXG4gICAgICAgICAgICBwcmU6IHRoaXMuX2Zvcm1hdFByZSgneWVhcicsIG9wdGlvbnMpLFxuICAgICAgICAgICAgc2xvdDogdGhpcy5fZm9ybWF0U2xvdCgneWVhcicpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmFsbERheSAmJiBuZWVkRGF0ZSkge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJhbGwgZGF5IG1vbnRoXCIsXG4gICAgICAgICAgICBmbjogdGhpcy5fZm9ybWF0Rm4oJ2FsbERheU1vbnRoJywgb3B0aW9ucyksXG4gICAgICAgICAgICBpZ25vcmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gZ29lc0ludG9UaGVNb3JuaW5nO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZTogdGhpcy5fZm9ybWF0UHJlKCdhbGxEYXlNb250aCcsIG9wdGlvbnMpLFxuICAgICAgICAgICAgc2xvdDogdGhpcy5fZm9ybWF0U2xvdCgnYWxsRGF5TW9udGgnKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmFsbERheSAmJiBuZWVkRGF0ZSkge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJtb250aFwiLFxuICAgICAgICAgICAgZm46IHRoaXMuX2Zvcm1hdEZuKCdtb250aCcsIG9wdGlvbnMpLFxuICAgICAgICAgICAgcHJlOiB0aGlzLl9mb3JtYXRQcmUoJ21vbnRoJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCdtb250aCcpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5ICYmIG5lZWREYXRlKSB7XG4gICAgICAgICAgZnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBcImRhdGVcIixcbiAgICAgICAgICAgIGZuOiB0aGlzLl9mb3JtYXRGbignZGF0ZScsIG9wdGlvbnMpLFxuICAgICAgICAgICAgcHJlOiB0aGlzLl9mb3JtYXRQcmUoJ2RhdGUnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHNsb3Q6IHRoaXMuX2Zvcm1hdFNsb3QoJ2RhdGUnKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZWVkRGF0ZSAmJiBvcHRpb25zLnNob3dEYXlPZldlZWspIHtcbiAgICAgICAgICBmcy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IFwiZGF5IG9mIHdlZWtcIixcbiAgICAgICAgICAgIGZuOiB0aGlzLl9mb3JtYXRGbignZGF5T2ZXZWVrJywgb3B0aW9ucyksXG4gICAgICAgICAgICBwcmU6IHRoaXMuX2Zvcm1hdFByZSgnZGF5T2ZXZWVrJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCdkYXlPZldlZWsnKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmdyb3VwTWVyaWRpZW1zICYmICFvcHRpb25zLnR3ZW50eUZvdXJIb3VyICYmICF0aGlzLmFsbERheSkge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJtZXJpZGllbVwiLFxuICAgICAgICAgICAgZm46IHRoaXMuX2Zvcm1hdEZuKCdtZXJpZGllbScsIG9wdGlvbnMpLFxuICAgICAgICAgICAgcHJlOiB0aGlzLl9mb3JtYXRQcmUoJ21lcmlkaWVtJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCdtZXJpZGllbScpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmFsbERheSkge1xuICAgICAgICAgIGZzLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogXCJ0aW1lXCIsXG4gICAgICAgICAgICBmbjogdGhpcy5fZm9ybWF0Rm4oJ3RpbWUnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHByZTogdGhpcy5fZm9ybWF0UHJlKCd0aW1lJywgb3B0aW9ucyksXG4gICAgICAgICAgICBzbG90OiB0aGlzLl9mb3JtYXRTbG90KCd0aW1lJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBzdGFydF9idWNrZXQgPSBbXTtcbiAgICAgICAgZW5kX2J1Y2tldCA9IFtdO1xuICAgICAgICBjb21tb25fYnVja2V0ID0gW107XG4gICAgICAgIHRvZ2V0aGVyID0gdHJ1ZTtcbiAgICAgICAgcHJvY2VzcyA9IGZ1bmN0aW9uKGZvcm1hdCkge1xuICAgICAgICAgIHZhciBlbmRfc3RyLCBzdGFydF9ncm91cCwgc3RhcnRfc3RyO1xuXG4gICAgICAgICAgc3RhcnRfc3RyID0gZm9ybWF0LmZuKF90aGlzLnN0YXJ0KTtcbiAgICAgICAgICBlbmRfc3RyID0gZm9ybWF0Lmlnbm9yZUVuZCAmJiBmb3JtYXQuaWdub3JlRW5kKCkgPyBzdGFydF9zdHIgOiBmb3JtYXQuZm4oX3RoaXMuZW5kKTtcbiAgICAgICAgICBzdGFydF9ncm91cCA9IHtcbiAgICAgICAgICAgIGZvcm1hdDogZm9ybWF0LFxuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gc3RhcnRfc3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGVuZF9zdHIgPT09IHN0YXJ0X3N0ciAmJiB0b2dldGhlcikge1xuICAgICAgICAgICAgcmV0dXJuIGNvbW1vbl9idWNrZXQucHVzaChzdGFydF9ncm91cCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0b2dldGhlcikge1xuICAgICAgICAgICAgICB0b2dldGhlciA9IGZhbHNlO1xuICAgICAgICAgICAgICBjb21tb25fYnVja2V0LnB1c2goe1xuICAgICAgICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgICAgICAgc2xvdDogZm9ybWF0LnNsb3QsXG4gICAgICAgICAgICAgICAgICBwcmU6IFwiXCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLnRlbXBsYXRlKGZvbGQoc3RhcnRfYnVja2V0KSwgZm9sZChlbmRfYnVja2V0LCB0cnVlKS50cmltKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFydF9idWNrZXQucHVzaChzdGFydF9ncm91cCk7XG4gICAgICAgICAgICByZXR1cm4gZW5kX2J1Y2tldC5wdXNoKHtcbiAgICAgICAgICAgICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZW5kX3N0cjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IGZzLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICAgICAgZm9ybWF0ID0gZnNbX2ldO1xuICAgICAgICAgIHByb2Nlc3MoZm9ybWF0KTtcbiAgICAgICAgfVxuICAgICAgICBnbG9iYWxfZmlyc3QgPSB0cnVlO1xuICAgICAgICBmb2xkID0gZnVuY3Rpb24oYXJyYXksIHNraXBfcHJlKSB7XG4gICAgICAgICAgdmFyIGxvY2FsX2ZpcnN0LCBzZWN0aW9uLCBzdHIsIF9qLCBfbGVuMSwgX3JlZjtcblxuICAgICAgICAgIGxvY2FsX2ZpcnN0ID0gdHJ1ZTtcbiAgICAgICAgICBzdHIgPSBcIlwiO1xuICAgICAgICAgIF9yZWYgPSBhcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmZvcm1hdC5zbG90IC0gYi5mb3JtYXQuc2xvdDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBmb3IgKF9qID0gMCwgX2xlbjEgPSBfcmVmLmxlbmd0aDsgX2ogPCBfbGVuMTsgX2orKykge1xuICAgICAgICAgICAgc2VjdGlvbiA9IF9yZWZbX2pdO1xuICAgICAgICAgICAgaWYgKCFnbG9iYWxfZmlyc3QpIHtcbiAgICAgICAgICAgICAgaWYgKGxvY2FsX2ZpcnN0ICYmIHNraXBfcHJlKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IFwiIFwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0ciArPSBzZWN0aW9uLmZvcm1hdC5wcmU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0ciArPSBzZWN0aW9uLnZhbHVlKCk7XG4gICAgICAgICAgICBnbG9iYWxfZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIGxvY2FsX2ZpcnN0ID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmb2xkKGNvbW1vbl9idWNrZXQpO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX3RydWVTdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5hbGxEYXkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zdGFydC5jbG9uZSgpLnN0YXJ0T2YoXCJkYXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc3RhcnQuY2xvbmUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX3RydWVFbmQgPSBmdW5jdGlvbihkaWZmYWJsZUVuZCkge1xuICAgICAgICBpZiAoZGlmZmFibGVFbmQgPT0gbnVsbCkge1xuICAgICAgICAgIGRpZmZhYmxlRW5kID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuYWxsRGF5KSB7XG4gICAgICAgICAgaWYgKGRpZmZhYmxlRW5kKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmQuY2xvbmUoKS5hZGQoMSwgXCJkYXlcIik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVuZC5jbG9uZSgpLmVuZE9mKFwiZGF5XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5lbmQuY2xvbmUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX2l0ZXJhdGVIZWxwZXIgPSBmdW5jdGlvbihwZXJpb2QsIGl0ZXIsIGhhc05leHQsIGludGVydmFsQW1vdW50KSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKGludGVydmFsQW1vdW50ID09IG51bGwpIHtcbiAgICAgICAgICBpbnRlcnZhbEFtb3VudCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB2YWw7XG5cbiAgICAgICAgICAgIGlmICghaGFzTmV4dCgpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFsID0gaXRlci5jbG9uZSgpO1xuICAgICAgICAgICAgICBpdGVyLmFkZChpbnRlcnZhbEFtb3VudCwgcGVyaW9kKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhc05leHQ6IGhhc05leHRcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLl9wcmVwSXRlcmF0ZUlucHV0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaW5wdXRzLCBpbnRlcnZhbEFtb3VudCwgbWluSG91cnMsIHBlcmlvZCwgX3JlZiwgX3JlZjE7XG5cbiAgICAgICAgaW5wdXRzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dHNbMF0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgcmV0dXJuIGlucHV0cztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGlucHV0c1swXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBwZXJpb2QgPSBpbnB1dHMuc2hpZnQoKTtcbiAgICAgICAgICBpbnRlcnZhbEFtb3VudCA9IChfcmVmID0gaW5wdXRzLnBvcCgpKSAhPSBudWxsID8gX3JlZiA6IDE7XG4gICAgICAgICAgaWYgKGlucHV0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG1pbkhvdXJzID0gKF9yZWYxID0gaW5wdXRzWzBdKSAhPSBudWxsID8gX3JlZjEgOiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vbWVudC5pc0R1cmF0aW9uKGlucHV0c1swXSkpIHtcbiAgICAgICAgICBwZXJpb2QgPSAnbWlsbGlzZWNvbmRzJztcbiAgICAgICAgICBpbnRlcnZhbEFtb3VudCA9IGlucHV0c1swXS5hcyhwZXJpb2QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbaW50ZXJ2YWxBbW91bnQsIHBlcmlvZCwgbWluSG91cnNdO1xuICAgICAgfTtcblxuICAgICAgVHdpeC5wcm90b3R5cGUuX2lubmVyID0gZnVuY3Rpb24ocGVyaW9kLCBpbnRlcnZhbEFtb3VudCkge1xuICAgICAgICB2YXIgZHVyYXRpb25Db3VudCwgZHVyYXRpb25QZXJpb2QsIGVuZCwgbW9kdWx1cywgc3RhcnQ7XG5cbiAgICAgICAgaWYgKHBlcmlvZCA9PSBudWxsKSB7XG4gICAgICAgICAgcGVyaW9kID0gXCJtaWxsaXNlY29uZHNcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW50ZXJ2YWxBbW91bnQgPT0gbnVsbCkge1xuICAgICAgICAgIGludGVydmFsQW1vdW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBzdGFydCA9IHRoaXMuX3RydWVTdGFydCgpO1xuICAgICAgICBlbmQgPSB0aGlzLl90cnVlRW5kKHRydWUpO1xuICAgICAgICBpZiAoc3RhcnQgPiBzdGFydC5jbG9uZSgpLnN0YXJ0T2YocGVyaW9kKSkge1xuICAgICAgICAgIHN0YXJ0LnN0YXJ0T2YocGVyaW9kKS5hZGQoaW50ZXJ2YWxBbW91bnQsIHBlcmlvZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZCA8IGVuZC5jbG9uZSgpLmVuZE9mKHBlcmlvZCkpIHtcbiAgICAgICAgICBlbmQuc3RhcnRPZihwZXJpb2QpO1xuICAgICAgICB9XG4gICAgICAgIGR1cmF0aW9uUGVyaW9kID0gc3RhcnQudHdpeChlbmQpLmFzRHVyYXRpb24ocGVyaW9kKTtcbiAgICAgICAgZHVyYXRpb25Db3VudCA9IGR1cmF0aW9uUGVyaW9kLmdldChwZXJpb2QpO1xuICAgICAgICBtb2R1bHVzID0gZHVyYXRpb25Db3VudCAlIGludGVydmFsQW1vdW50O1xuICAgICAgICBlbmQuc3VidHJhY3QobW9kdWx1cywgcGVyaW9kKTtcbiAgICAgICAgcmV0dXJuIFtzdGFydCwgZW5kXTtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLl9sYXp5TGFuZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZSwgbGFuZ0RhdGEsIGxhbmd1YWdlcywgX3JlZjtcblxuICAgICAgICBsYW5nRGF0YSA9IHRoaXMuc3RhcnQubGFuZygpO1xuICAgICAgICBpZiAoKGxhbmdEYXRhICE9IG51bGwpICYmIHRoaXMuZW5kLmxhbmcoKS5fYWJiciAhPT0gbGFuZ0RhdGEuX2FiYnIpIHtcbiAgICAgICAgICB0aGlzLmVuZC5sYW5nKGxhbmdEYXRhLl9hYmJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHRoaXMubGFuZ0RhdGEgIT0gbnVsbCkgJiYgdGhpcy5sYW5nRGF0YS5fYWJiciA9PT0gbGFuZ0RhdGEuX2FiYnIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc01vZHVsZSAmJiAhKGxhbmd1YWdlc0xvYWRlZCB8fCBsYW5nRGF0YS5fYWJiciA9PT0gXCJlblwiKSkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsYW5ndWFnZXMgPSByZXF1aXJlKFwiLi9sYW5nXCIpO1xuICAgICAgICAgICAgbGFuZ3VhZ2VzKG1vbWVudCwgVHdpeCk7XG4gICAgICAgICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICAgICAgICBlID0gX2Vycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsYW5ndWFnZXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxhbmdEYXRhID0gKF9yZWYgPSBsYW5nRGF0YSAhPSBudWxsID8gbGFuZ0RhdGEuX3R3aXggOiB2b2lkIDApICE9IG51bGwgPyBfcmVmIDogVHdpeC5kZWZhdWx0cztcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLl9mb3JtYXRGbiA9IGZ1bmN0aW9uKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGFuZ0RhdGFbbmFtZV0uZm4ob3B0aW9ucyk7XG4gICAgICB9O1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5fZm9ybWF0U2xvdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGFuZ0RhdGFbbmFtZV0uc2xvdDtcbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLl9mb3JtYXRQcmUgPSBmdW5jdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5sYW5nRGF0YVtuYW1lXS5wcmUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHJldHVybiB0aGlzLmxhbmdEYXRhW25hbWVdLnByZShvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5sYW5nRGF0YVtuYW1lXS5wcmU7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLnNhbWVEYXkgPSBkZXByZWNhdGUoXCJzYW1lRGF5XCIsIFwiaXNTYW1lKCdkYXknKVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTYW1lKFwiZGF5XCIpO1xuICAgICAgfSk7XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLnNhbWVZZWFyID0gZGVwcmVjYXRlKFwic2FtZVllYXJcIiwgXCJpc1NhbWUoJ3llYXInKVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNTYW1lKFwieWVhclwiKTtcbiAgICAgIH0pO1xuXG4gICAgICBUd2l4LnByb3RvdHlwZS5jb3VudERheXMgPSBkZXByZWNhdGUoXCJjb3VudERheXNcIiwgXCJjb3VudE91dGVyKCdkYXlzJylcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvdW50T3V0ZXIoXCJkYXlzXCIpO1xuICAgICAgfSk7XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmRheXNJbiA9IGRlcHJlY2F0ZShcImRheXNJblwiLCBcIml0ZXJhdGUoJ2RheXMnIFssbWluSG91cnNdKVwiLCBmdW5jdGlvbihtaW5Ib3Vycykge1xuICAgICAgICByZXR1cm4gdGhpcy5pdGVyYXRlKCdkYXlzJywgbWluSG91cnMpO1xuICAgICAgfSk7XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLnBhc3QgPSBkZXByZWNhdGUoXCJwYXN0XCIsIFwiaXNQYXN0KClcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzUGFzdCgpO1xuICAgICAgfSk7XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLmR1cmF0aW9uID0gZGVwcmVjYXRlKFwiZHVyYXRpb25cIiwgXCJodW1hbml6ZUxlbmd0aCgpXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5odW1hbml6ZUxlbmd0aCgpO1xuICAgICAgfSk7XG5cbiAgICAgIFR3aXgucHJvdG90eXBlLm1lcmdlID0gZGVwcmVjYXRlKFwibWVyZ2VcIiwgXCJ1bmlvbihvdGhlcilcIiwgZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudW5pb24ob3RoZXIpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBUd2l4O1xuXG4gICAgfSkoKTtcbiAgICBnZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uKG8pIHtcbiAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmdldFByb3RvdHlwZU9mID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTtcbiAgICAgIH0gZWxzZSBpZiAoXCJcIi5fX3Byb3RvX18gPT09IFN0cmluZy5wcm90b3R5cGUpIHtcbiAgICAgICAgcmV0dXJuIG8uX19wcm90b19fO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG8uY29uc3RydWN0b3IucHJvdG90eXBlO1xuICAgICAgfVxuICAgIH07XG4gICAgVHdpeC5fZXh0ZW5kKGdldFByb3RvdHlwZU9mKG1vbWVudC5mbi5fbGFuZyksIHtcbiAgICAgIF90d2l4OiBUd2l4LmRlZmF1bHRzXG4gICAgfSk7XG4gICAgVHdpeC5mb3JtYXRUZW1wbGF0ZSA9IGZ1bmN0aW9uKGxlZnRTaWRlLCByaWdodFNpZGUpIHtcbiAgICAgIHJldHVybiBcIlwiICsgbGVmdFNpZGUgKyBcIiAtIFwiICsgcmlnaHRTaWRlO1xuICAgIH07XG4gICAgbW9tZW50LnR3aXggPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZnVuY3Rpb24oZnVuYywgYXJncywgY3Rvcikge1xuICAgICAgICBjdG9yLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgY3RvciwgcmVzdWx0ID0gZnVuYy5hcHBseShjaGlsZCwgYXJncyk7XG4gICAgICAgIHJldHVybiBPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0ID8gcmVzdWx0IDogY2hpbGQ7XG4gICAgICB9KShUd2l4LCBhcmd1bWVudHMsIGZ1bmN0aW9uKCl7fSk7XG4gICAgfTtcbiAgICBtb21lbnQuZm4udHdpeCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChmdW5jdGlvbihmdW5jLCBhcmdzLCBjdG9yKSB7XG4gICAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyBjdG9yLCByZXN1bHQgPSBmdW5jLmFwcGx5KGNoaWxkLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdChyZXN1bHQpID09PSByZXN1bHQgPyByZXN1bHQgOiBjaGlsZDtcbiAgICAgIH0pKFR3aXgsIFt0aGlzXS5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3VtZW50cykpLCBmdW5jdGlvbigpe30pO1xuICAgIH07XG4gICAgbW9tZW50LmZuLmZvckR1cmF0aW9uID0gZnVuY3Rpb24oZHVyYXRpb24sIGFsbERheSkge1xuICAgICAgcmV0dXJuIG5ldyBUd2l4KHRoaXMsIHRoaXMuY2xvbmUoKS5hZGQoZHVyYXRpb24pLCBhbGxEYXkpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFmdGVyTW9tZW50ID0gZnVuY3Rpb24oc3RhcnRpbmdUaW1lLCBhbGxEYXkpIHtcbiAgICAgIHJldHVybiBuZXcgVHdpeChzdGFydGluZ1RpbWUsIG1vbWVudChzdGFydGluZ1RpbWUpLmNsb25lKCkuYWRkKHRoaXMpLCBhbGxEYXkpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmJlZm9yZU1vbWVudCA9IGZ1bmN0aW9uKHN0YXJ0aW5nVGltZSwgYWxsRGF5KSB7XG4gICAgICByZXR1cm4gbmV3IFR3aXgobW9tZW50KHN0YXJ0aW5nVGltZSkuY2xvbmUoKS5zdWJ0cmFjdCh0aGlzKSwgc3RhcnRpbmdUaW1lLCBhbGxEYXkpO1xuICAgIH07XG4gICAgbW9tZW50LnR3aXhDbGFzcyA9IFR3aXg7XG4gICAgcmV0dXJuIFR3aXg7XG4gIH07XG5cbiAgaWYgKGhhc01vZHVsZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gbWFrZVR3aXgocmVxdWlyZShcIm1vbWVudFwiKSk7XG4gIH1cblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZGVmaW5lKFwidHdpeFwiLCBbXCJtb21lbnRcIl0sIGZ1bmN0aW9uKG1vbWVudCkge1xuICAgICAgcmV0dXJuIG1ha2VUd2l4KG1vbWVudCk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAodGhpcy5tb21lbnQgIT0gbnVsbCkge1xuICAgIHRoaXMuVHdpeCA9IG1ha2VUd2l4KHRoaXMubW9tZW50KTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICBncnBoID0ge307XG4iLCJcbmZ1bmN0aW9uIGdycGhfYXhpc19jYXRlZ29yaWNhbCgpIHtcblxuICB2YXIgc2NhbGUgPSBncnBoX3NjYWxlX2NhdGVnb3JpY2FsKCk7XG4gIHZhciB3aWR0aDtcbiAgdmFyIHZhcmlhYmxlLCBoZWlnaHQ7XG4gIHZhciB0aWNrX2Zvcm1hdCA9IGZ1bmN0aW9uKHgpe3JldHVybiB4O307XG5cbiAgdmFyIGR1bW15XyA9IGQzLnNlbGVjdChcImJvZHlcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLCBcImF4aXNfY2F0ZWdvcmljYWwgZHVtbXlcIilcbiAgICAuYXR0cihcIndpZHRoXCIsIDApLmF0dHIoXCJoZWlnaHRcIiwgMClcbiAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICB2YXIgbGFiZWxfc2l6ZV8gPSBncnBoX2xhYmVsX3NpemUoZHVtbXlfKTtcblxuICBmdW5jdGlvbiBheGlzKGcpIHtcbiAgICB2YXIgdGlja3MgPSBheGlzLnRpY2tzKCk7XG4gICAgZy5hcHBlbmQoXCJyZWN0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgYXhpcy53aWR0aCgpKS5hdHRyKFwiaGVpZ2h0XCIsIGF4aXMuaGVpZ2h0KCkpO1xuICAgIGcuc2VsZWN0QWxsKFwiLnRpY2tcIikuZGF0YSh0aWNrcykuZW50ZXIoKVxuICAgICAgLmFwcGVuZChcImxpbmVcIikuYXR0cihcImNsYXNzXCIsIFwidGlja3NcIilcbiAgICAgIC5hdHRyKFwieDFcIiwgYXhpcy53aWR0aCgpIC0gc2V0dGluZ3MoXCJ0aWNrX2xlbmd0aFwiKSlcbiAgICAgIC5hdHRyKFwieDJcIiwgYXhpcy53aWR0aCgpKVxuICAgICAgLmF0dHIoXCJ5MVwiLCBzY2FsZS5tKS5hdHRyKFwieTJcIiwgc2NhbGUubSk7XG4gICAgZy5zZWxlY3RBbGwoXCIudGlja2xhYmVsXCIpLmRhdGEodGlja3MpLmVudGVyKClcbiAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIGF4aXMud2lkdGgoKSAtIHNldHRpbmdzKFwidGlja19sZW5ndGhcIikgLSBzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSlcbiAgICAgIC5hdHRyKFwieVwiLCBzY2FsZS5tKVxuICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gdGlja19mb3JtYXQoZCk7fSlcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcbiAgICAgIC5hdHRyKFwiZHlcIiwgXCIwLjM1ZW1cIik7XG4gICAgZy5hcHBlbmQoXCJsaW5lXCIpLmF0dHIoXCJjbGFzc1wiLCBcImF4aXNsaW5lXCIpXG4gICAgICAuYXR0cihcIngxXCIsIGF4aXMud2lkdGgoKSkuYXR0cihcIngyXCIsIGF4aXMud2lkdGgoKSlcbiAgICAgIC5hdHRyKFwieTFcIiwgMCkuIGF0dHIoXCJ5MlwiLCBheGlzLmhlaWdodCgpKTtcbiAgfVxuXG4gIGF4aXMud2lkdGggPSBmdW5jdGlvbih3KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciB0aWNrcyA9IHNjYWxlLnRpY2tzKCk7XG4gICAgICB2YXIgbWF4X3dpZHRoID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGlja3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGx3ID0gbGFiZWxfc2l6ZV8ud2lkdGgodGlja19mb3JtYXQodGlja3NbaV0pKTtcbiAgICAgICAgaWYgKGx3ID4gbWF4X3dpZHRoKSBtYXhfd2lkdGggPSBsdztcbiAgICAgIH1cbiAgICAgIHdpZHRoID0gbWF4X3dpZHRoICsgc2V0dGluZ3MoXCJ0aWNrX2xlbmd0aFwiKSArIHNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpO1xuICAgICAgcmV0dXJuIHdpZHRoO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aWR0aCA9IHc7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodCA9IGg7XG4gICAgICBzY2FsZS5yYW5nZShbMCwgaF0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuYWNjZXB0ID0gZnVuY3Rpb24odmFyaWFibGUsIHNjaGVtYSkge1xuICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgIHJldHVybiB2c2NoZW1hLnR5cGUgPT0gJ3N0cmluZycgfHwgdnNjaGVtYS50eXBlID09ICdjYXRlZ29yaWNhbCcgfHxcbiAgICAgIHZzY2hlbWEudHlwZSA9PSAncGVyaW9kJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhcmlhYmxlID0gdjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmRvbWFpbiA9IGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2NhbGUuZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2YXJpYWJsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgICAgdmFyIGRvbWFpbiA9IFtdO1xuICAgICAgaWYgKHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIpIHtcbiAgICAgICAgZG9tYWluID0gdnNjaGVtYS5jYXRlZ29yaWVzLm1hcChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWU7IH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7IHJldHVybiBkW3ZhcmlhYmxlXTt9KTtcbiAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBkdXBsaWNhdGUgdmFsdWVzXG4gICAgICAgIGRvbWFpbiA9IGQuZmlsdGVyKGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgc2VsZikge1xuICAgICAgICAgIHJldHVybiBzZWxmLmluZGV4T2YodmFsdWUpID09PSBpbmRleDtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB0aWNrX2Zvcm1hdCA9IHZhcmlhYmxlX3ZhbHVlX2Zvcm1hdHRlcih2YXJpYWJsZSwgc2NoZW1hKTtcbiAgICAgIHNjYWxlLmRvbWFpbihkb21haW4pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2NhbGUudGlja3MoKTtcbiAgfTtcblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHNjYWxlKHZbdmFyaWFibGVdKS5tO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NhbGUodikubTtcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5zY2FsZS5sID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHNjYWxlKHZbdmFyaWFibGVdKS5sO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NhbGUodikubDtcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5zY2FsZS51ID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHNjYWxlKHZbdmFyaWFibGVdKS51O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NhbGUodikudTtcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5zY2FsZS53ID0gZnVuY3Rpb24odikge1xuICAgIHZhciByO1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0Jykge1xuICAgICAgciA9IHNjYWxlKHZbdmFyaWFibGVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgciA9IHNjYWxlKHYpO1xuICAgIH1cbiAgICByZXR1cm4gci51IC0gci5sO1xuICB9O1xuXG4gIHJldHVybiBheGlzO1xufVxuXG5pZiAoZ3JwaC5heGlzID09PSB1bmRlZmluZWQpIGdycGguYXhpcyA9IHt9O1xuZ3JwaC5heGlzLmNhdGVnb3JpY2FsID0gZ3JwaF9heGlzX2NhdGVnb3JpY2FsKCk7XG4iLCJcbmZ1bmN0aW9uIGdycGhfYXhpc19jaGxvcm9wbGV0aCgpIHtcblxuICB2YXIgdmFyaWFibGU7XG4gIHZhciB3aWR0aCwgaGVpZ2h0O1xuICB2YXIgc2NhbGUgPSBncnBoX3NjYWxlX2NobG9yb3BsZXRoKCk7XG5cbiAgZnVuY3Rpb24gYXhpcyhnKSB7XG4gIH1cblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24odykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gd2lkdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpZHRoID0gdztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmhlaWdodCA9IGZ1bmN0aW9uKGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgaGVpZ2h0ID0gaDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmFjY2VwdCA9IGZ1bmN0aW9uKHZhcmlhYmxlLCBzY2hlbWEpIHtcbiAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZSwgc2NoZW1hKTtcbiAgICByZXR1cm4gdnNjaGVtYS50eXBlID09ICdudW1iZXInO1xuICB9O1xuXG4gIGF4aXMudmFyaWFibGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB2YXJpYWJsZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGUgPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuZG9tYWluID0gZnVuY3Rpb24oZGF0YSwgc2NoZW1hKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzY2FsZS5kb21haW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHZhcmlhYmxlID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzO1xuICAgICAgc2NhbGUuZG9tYWluKGQzLmV4dGVudChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkW3ZhcmlhYmxlXTt9KSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzY2FsZS50aWNrcygpO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKHR5cGVvZiB2ID09ICdvYmplY3QnKSB7IFxuICAgICAgcmV0dXJuIGF4aXMuc2NhbGUodlt2YXJpYWJsZV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc2NhbGUodik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBheGlzO1xufVxuXG5pZiAoZ3JwaC5heGlzID09PSB1bmRlZmluZWQpIGdycGguYXhpcyA9IHt9O1xuZ3JwaC5heGlzLmNobG9yb3BsZXRoID0gZ3JwaF9heGlzX2NobG9yb3BsZXRoKCk7XG5cbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX2NvbG91cigpIHtcblxuICB2YXIgc2NhbGUgPSBncnBoX3NjYWxlX2NvbG91cigpO1xuICB2YXIgdmFyaWFibGVfO1xuICB2YXIgd2lkdGhfLCBoZWlnaHRfO1xuXG4gIGZ1bmN0aW9uIGF4aXMoZykge1xuICB9XG5cbiAgYXhpcy53aWR0aCA9IGZ1bmN0aW9uKHdpZHRoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB3aWR0aF87XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpZHRoXyA9IHdpZHRoO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBoZWlnaHRfO1xuICAgIH0gZWxzZSB7XG4gICAgICBoZWlnaHRfID0gaGVpZ2h0O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuYWNjZXB0ID0gZnVuY3Rpb24odmFyaWFibGUsIHNjaGVtYSkge1xuICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgIHJldHVybiB2c2NoZW1hLnR5cGUgPT0gXCJjYXRlZ29yaWNhbFwiIHx8IHZzY2hlbWEudHlwZSA9PSBcInBlcmlvZFwiO1xuICB9O1xuXG4gIGF4aXMudmFyaWFibGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB2YXJpYWJsZV87XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhcmlhYmxlXyA9IHY7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNjYWxlLmRvbWFpbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodmFyaWFibGVfID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2NhbGUuZG9tYWluKHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGVfLCBzY2hlbWEpO1xuICAgICAgdmFyIGNhdGVnb3JpZXMgPSBbXTtcbiAgICAgIGlmICh2c2NoZW1hLnR5cGUgPT0gXCJjYXRlZ29yaWNhbFwiKSB7XG4gICAgICAgIGNhdGVnb3JpZXMgPSB2c2NoZW1hLmNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQubmFtZTsgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdmFscyA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRbdmFyaWFibGVfXTt9KS5zb3J0KCk7XG4gICAgICAgIHZhciBwcmV2O1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBpZiAodmFsc1tpXSAhPSBwcmV2KSBjYXRlZ29yaWVzLnB1c2goXCJcIiArIHZhbHNbaV0pO1xuICAgICAgICAgIHByZXYgPSB2YWxzW2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzY2FsZS5kb21haW4oY2F0ZWdvcmllcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzY2FsZS50aWNrcygpO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKHR5cGVvZiB2ID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gc2NhbGUodlt2YXJpYWJsZV9dKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNjYWxlKHYpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gYXhpcztcbn1cblxuaWYgKGdycGguYXhpcyA9PT0gdW5kZWZpbmVkKSBncnBoLmF4aXMgPSB7fTtcbmdycGguYXhpcy5jb2xvdXIgPSBncnBoX2F4aXNfY29sb3VyKCk7XG4iLCJcbmZ1bmN0aW9uIGdycGhfYXhpc19saW5lYXIoaG9yaXpvbnRhbCkge1xuXG4gIHZhciBzY2FsZV8gPSBncnBoX3NjYWxlX2xpbmVhcigpO1xuICB2YXIgaG9yaXpvbnRhbF8gPSBob3Jpem9udGFsO1xuICB2YXIgdmFyaWFibGVfO1xuICB2YXIgd2lkdGhfLCBoZWlnaHRfO1xuICB2YXIgb3JpZ2luXztcbiAgdmFyIHNldHRpbmdzXyA9IHtcbiAgICBcInRpY2tfbGVuZ3RoXCIgOiA1LFxuICAgIFwidGlja19wYWRkaW5nXCIgOiAyLFxuICAgIFwicGFkZGluZ1wiIDogNFxuICB9O1xuXG4gIHZhciBkdW1teV8gPSBkMy5zZWxlY3QoXCJib2R5XCIpLmFwcGVuZChcInN2Z1wiKVxuICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5lYXJheGlzIGR1bW15XCIpXG4gICAgLmF0dHIoXCJ3aWR0aFwiLCAwKS5hdHRyKFwiaGVpZ2h0XCIsIDApXG4gICAgLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgdmFyIGxhYmVsX3NpemVfID0gZ3JwaF9sYWJlbF9zaXplKGR1bW15Xyk7XG4gIGlmIChob3Jpem9udGFsXykgc2NhbGVfLmxhYmVsX3NpemUobGFiZWxfc2l6ZV8ud2lkdGgpO1xuICBlbHNlIHNjYWxlXy5sYWJlbF9zaXplKGxhYmVsX3NpemVfLmhlaWdodCk7XG4gIFxuXG4gIGZ1bmN0aW9uIGF4aXMoZykge1xuICAgIHZhciB3ID0gYXhpcy53aWR0aCgpO1xuICAgIHZhciB0aWNrcyA9IGF4aXMudGlja3MoKTtcbiAgICBnLmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsIFwiYmFja2dyb3VuZFwiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3KS5hdHRyKFwiaGVpZ2h0XCIsIGF4aXMuaGVpZ2h0KCkpO1xuICAgIGlmIChob3Jpem9udGFsKSB7XG4gICAgICBnLnNlbGVjdEFsbChcIi50aWNrXCIpLmRhdGEodGlja3MpLmVudGVyKClcbiAgICAgICAgLmFwcGVuZChcImxpbmVcIikuYXR0cihcImNsYXNzXCIsIFwidGlja1wiKVxuICAgICAgICAuYXR0cihcIngxXCIsIHNjYWxlXykuYXR0cihcIngyXCIsIHNjYWxlXylcbiAgICAgICAgLmF0dHIoXCJ5MVwiLCAwKS5hdHRyKFwieTJcIiwgc2V0dGluZ3NfLnRpY2tfbGVuZ3RoKTtcbiAgICAgIGcuc2VsZWN0QWxsKFwiLnRpY2tsYWJlbFwiKS5kYXRhKHRpY2tzKS5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgICAuYXR0cihcInhcIiwgc2NhbGVfKS5hdHRyKFwieVwiLCBzZXR0aW5nc18udGlja19sZW5ndGggKyBzZXR0aW5nc18udGlja19wYWRkaW5nKVxuICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkO30pXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgLmF0dHIoXCJkeVwiLCBcIjAuNzFlbVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5zZWxlY3RBbGwoXCIudGlja1wiKS5kYXRhKHRpY2tzKS5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tcIilcbiAgICAgICAgLmF0dHIoXCJ4MVwiLCB3LXNldHRpbmdzXy50aWNrX2xlbmd0aCkuYXR0cihcIngyXCIsIHcpXG4gICAgICAgIC5hdHRyKFwieTFcIiwgc2NhbGVfKS5hdHRyKFwieTJcIiwgc2NhbGVfKTtcbiAgICAgIGcuc2VsZWN0QWxsKFwiLnRpY2tsYWJlbFwiKS5kYXRhKHRpY2tzKS5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tsYWJlbFwiKVxuICAgICAgICAuYXR0cihcInhcIiwgc2V0dGluZ3NfLnBhZGRpbmcpLmF0dHIoXCJ5XCIsIHNjYWxlXylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZDt9KVxuICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwiYmVnaW5cIilcbiAgICAgICAgLmF0dHIoXCJkeVwiLCBcIjAuMzVlbVwiKTtcbiAgICB9XG4gIH1cblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgICBpZiAoaG9yaXpvbnRhbF8pIHtcbiAgICAgIC8vIGlmIGhvcml6b250YWwgdGhlIHdpZHRoIGlzIHVzdWFsbHkgZ2l2ZW47IHRoaXMgZGVmaW5lcyB0aGUgcmFuZ2Ugb2ZcbiAgICAgIC8vIHRoZSBzY2FsZVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHdpZHRoXztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdpZHRoXyA9IHdpZHRoO1xuICAgICAgICBzY2FsZV8ucmFuZ2UoWzAsIHdpZHRoX10pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaWYgdmVydGljYWwgdGhlIHdpZHRoIGlzIHVzdWFsbHkgZGVmaW5lZCBieSB0aGUgZ3JhcGg6IHRoZSBzcGFjZSBpdFxuICAgICAgLy8gbmVlZHMgdG8gZHJhdyB0aGUgdGlja21hcmtzIGFuZCBsYWJlbHMgZXRjLiBcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciB0aWNrcyA9IHNjYWxlXy50aWNrcygpO1xuICAgICAgICB2YXIgdyA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGlja3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICB2YXIgbHcgPSBsYWJlbF9zaXplXy53aWR0aCh0aWNrc1tpXSk7XG4gICAgICAgICAgaWYgKGx3ID4gdykgdyA9IGx3O1xuICAgICAgICB9XG4gICAgICAgIHdpZHRoXyA9IHcgKyBzZXR0aW5nc18udGlja19sZW5ndGggKyBzZXR0aW5nc18udGlja19wYWRkaW5nICsgc2V0dGluZ3NfLnBhZGRpbmc7ICBcbiAgICAgICAgcmV0dXJuIHdpZHRoXztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdpZHRoXyA9IHdpZHRoO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoZWlnaHQpIHtcbiAgICBpZiAoaG9yaXpvbnRhbF8pIHtcbiAgICAgIC8vIGlmIGhvcml6b250YWwgdGhlIHdpZHRoIGlzIHVzdWFsbHkgZGVmaW5lZCBieSB0aGUgZ3JhcGg6IHRoZSBzcGFjZSBpdFxuICAgICAgLy8gbmVlZHMgdG8gZHJhdyB0aGUgdGlja21hcmtzIGFuZCBsYWJlbHMgZXRjLiBcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciB0aWNrcyA9IHNjYWxlXy50aWNrcygpO1xuICAgICAgICB2YXIgaCA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGlja3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICB2YXIgbGggPSBsYWJlbF9zaXplXy5oZWlnaHQodGlja3NbaV0pO1xuICAgICAgICAgIGlmIChsaCA+IGgpIGggPSBsaDtcbiAgICAgICAgfVxuICAgICAgICBoZWlnaHRfID0gaCArIHNldHRpbmdzXy50aWNrX2xlbmd0aCArIHNldHRpbmdzXy50aWNrX3BhZGRpbmcgKyBzZXR0aW5nc18ucGFkZGluZzsgXG4gICAgICAgIHJldHVybiBoZWlnaHRfO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGVpZ2h0XyA9IGhlaWdodDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGlmIHZlcnRpY2FsIHRoZSB3aWR0aCBpcyB1c3VhbGx5IGdpdmVuOyB0aGlzIGRlZmluZXMgdGhlIHJhbmdlIG9mXG4gICAgICAvLyB0aGUgc2NhbGVcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBoZWlnaHRfO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGVpZ2h0XyA9IGhlaWdodDtcbiAgICAgICAgc2NhbGVfLnJhbmdlKFtoZWlnaHRfLCAwXSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBheGlzLmFjY2VwdCA9IGZ1bmN0aW9uKHZhcmlhYmxlLCBzY2hlbWEpIHtcbiAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZSwgc2NoZW1hKTtcbiAgICByZXR1cm4gdnNjaGVtYS50eXBlID09ICdudW1iZXInO1xuICB9O1xuXG4gIGF4aXMudmFyaWFibGUgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB2YXJpYWJsZV87XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhcmlhYmxlXyA9IHY7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNjYWxlXy5kb21haW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJhbmdlID0gZDMuZXh0ZW50KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuICtkW3ZhcmlhYmxlX107fSk7XG4gICAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgICBpZiAodnNjaGVtYS5vcmlnaW4pIG9yaWdpbl8gPSB2c2NoZW1hLm9yaWdpbjtcbiAgICAgIGlmIChvcmlnaW5fICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHJhbmdlWzBdID4gb3JpZ2luXykgcmFuZ2VbMF0gPSBvcmlnaW5fO1xuICAgICAgICBpZiAocmFuZ2VbMV0gPCBvcmlnaW5fKSByYW5nZVsxXSA9IG9yaWdpbl87XG4gICAgICB9XG4gICAgICBzY2FsZV8uZG9tYWluKHJhbmdlKS5uaWNlKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5vcmlnaW4gPSBmdW5jdGlvbihvcmlnaW4pIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG9yaWdpbl87XG4gICAgfSBlbHNlIHtcbiAgICAgIG9yaWdpbl8gPSBvcmlnaW47XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzY2FsZV8udGlja3MoKTtcbiAgfTtcblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0JykgeyBcbiAgICAgIHJldHVybiBzY2FsZV8odlt2YXJpYWJsZV9dKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNjYWxlXyh2KTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmlmIChncnBoLmF4aXMgPT09IHVuZGVmaW5lZCkgZ3JwaC5heGlzID0ge307XG5ncnBoLmF4aXMubGluZWFyID0gZ3JwaF9heGlzX2xpbmVhcigpO1xuXG4iLCJcbmZ1bmN0aW9uIGdycGhfYXhpc19wZXJpb2QoKSB7XG5cbiAgdmFyIHNjYWxlXyA9IGdycGhfc2NhbGVfcGVyaW9kKCk7XG4gIHZhciBoZWlnaHRfO1xuICB2YXIgdmFyaWFibGVfO1xuICB2YXIgc2V0dGluZ3MgPSB7XG4gICAgXCJ0aWNrX2xlbmd0aFwiIDogWzE1LCAzMCwgNDVdLFxuICAgIFwidGljay10aHJlc2hvbGRcIiA6IDcsXG4gICAgXCJsYWJlbC15ZWFyLXNtYWxsXCIgOiAzMCxcbiAgICBcImxhYmVsLXRocmVzaG9sZFwiIDogMTNcbiAgfTtcblxuICAvLyBjaGVja3MgaWYgd2UgbmVlZC93YW50IHRvIGRyYXcgdGlja21hcmtzIGFuZCBsYWJlbHMgZm9yIG1vbnRocyBhbmRcbiAgLy8gcXVhcnRlcnMuIFRoaXMgZGVwZW5kcyBvbiB0aGUgZGVuc2l0eS4gV2hlbiB0aCBkZW5zaXR5IGJlY29tZXMgdG9vXG4gIC8vIGxhcmdlIGZpcnN0IG5vIGxhYmVscyBhcmUgZHJhd247IHdoZW4gaGlnaGVyIHRoZSB0aWNrc21hcmtzIGFyZSBhbHNvXG4gIC8vIG5vdCBkcmF3bi5cbiAgZnVuY3Rpb24gZGV0ZXJtaW5lX3doYXRfdG9fZHJhdyh0aWNrcykge1xuICAgIC8vIGRldGVybWluZSBpZiB3ZSB3YW50IHRvIGRyYXcgdGlja3MgYW5kIGxhYmVscyBmb3IgbW9udGhzXG4gICAgdmFyIG4gPSB0aWNrcy5maWx0ZXIoZnVuY3Rpb24odCkge3JldHVybiB0LnR5cGUgPT0gXCJtb250aFwiO30pLmxlbmd0aDtcbiAgICB2YXIgZCA9IChzY2FsZV8ucmFuZ2UoKVsxXSAtIHNjYWxlXy5yYW5nZSgpWzBdKSAvIG47XG4gICAgdmFyIG1vbnRoX3RpY2tzICA9IHNjYWxlXy5oYXNfbW9udGgoKSAmJiBkID4gc2V0dGluZ3NbJ3RpY2stdGhyZXNob2xkJ107XG4gICAgdmFyIG1vbnRoX2xhYmVscyA9IHNjYWxlXy5oYXNfbW9udGgoKSAmJiBkID4gc2V0dGluZ3NbJ2xhYmVsLXRocmVzaG9sZCddO1xuICAgIC8vIGRldGVybWluZSBpZiB3ZSB3YW50IHRvIGRyYXcgdGlja3MgYW5kIGxhYmVscyBmb3IgcXVhcnRlcnNcbiAgICBuID0gdGlja3MuZmlsdGVyKGZ1bmN0aW9uKHQpIHtyZXR1cm4gdC50eXBlID09IFwicXVhcnRlclwiO30pLmxlbmd0aDtcbiAgICBkID0gKHNjYWxlXy5yYW5nZSgpWzFdIC0gc2NhbGVfLnJhbmdlKClbMF0pIC8gbjtcbiAgICB2YXIgcXVhcnRlcl90aWNrcyAgPSBzY2FsZV8uaGFzX3F1YXJ0ZXIoKSAmJiBkID4gc2V0dGluZ3NbJ3RpY2stdGhyZXNob2xkJ107XG4gICAgdmFyIHF1YXJ0ZXJfbGFiZWxzID0gc2NhbGVfLmhhc19xdWFydGVyKCkgJiYgZCA+IHNldHRpbmdzWydsYWJlbC10aHJlc2hvbGQnXTtcbiAgICAvLyBkZXRlcm1pbmUgaWYgd2Ugd2FudCB0byBkcmF3IGFsbCB5ZWFyIGxhYmVscyBvciBvbmx5IHRoZSBiZWdpbiBhbmQgZW5kXG4gICAgLy8gbGFiZWxzXG4gICAgbiA9IHRpY2tzLmZpbHRlcihmdW5jdGlvbih0KSB7cmV0dXJuIHQudHlwZSA9PSBcInllYXJcIjt9KS5sZW5ndGg7XG4gICAgZCA9IChzY2FsZV8ucmFuZ2UoKVsxXSAtIHNjYWxlXy5yYW5nZSgpWzBdKSAvIG47XG4gICAgY29uc29sZS5sb2coJ249JywgbiwgJzsgZD0nLCBkKTtcbiAgICB2YXIgeWVhcl9sYWJlbHMgPSBkID4gc2V0dGluZ3NbJ2xhYmVsLXRocmVzaG9sZCddO1xuICAgIHZhciB5ZWFyX3NtYWxsID0gZCA8IHNldHRpbmdzWydsYWJlbC15ZWFyLXNtYWxsJ107XG4gICAgcmV0dXJuIHtcbiAgICAgIG1vbnRoIDoge3RpY2tzIDogbW9udGhfdGlja3MsIGxhYmVscyA6IG1vbnRoX2xhYmVsc30sXG4gICAgICBxdWFydGVyIDoge3RpY2tzIDogcXVhcnRlcl90aWNrcywgbGFiZWxzIDogcXVhcnRlcl90aWNrc30sXG4gICAgICB5ZWFyIDoge3RpY2tzOiB0cnVlLCBsYWJlbHMgOiB5ZWFyX2xhYmVscywgc21hbGw6IHllYXJfc21hbGx9XG4gICAgfTtcbiAgfVxuXG4gIHZhciBheGlzID0gZnVuY3Rpb24oZykge1xuICAgIHZhciB0aWNrcyA9IHNjYWxlXy50aWNrcygpO1xuXG4gICAgdmFyIHRvX2RyYXcgPSBkZXRlcm1pbmVfd2hhdF90b19kcmF3KHRpY2tzKTtcblxuICAgIHZhciB0aWNrX2xlbmd0aCA9IHt9O1xuICAgIHZhciB0aWNrID0gMDtcbiAgICBpZiAodG9fZHJhdy5tb250aC50aWNrcykgdGlja19sZW5ndGgubW9udGggPSBzZXR0aW5ncy50aWNrX2xlbmd0aFt0aWNrKytdO1xuICAgIGlmICh0b19kcmF3LnF1YXJ0ZXIudGlja3MpIHRpY2tfbGVuZ3RoLnF1YXJ0ZXIgPSBzZXR0aW5ncy50aWNrX2xlbmd0aFt0aWNrKytdO1xuICAgIHRpY2tfbGVuZ3RoLnllYXIgPSBzZXR0aW5ncy50aWNrX2xlbmd0aFt0aWNrKytdO1xuXG4gICAgLy8gZHJhdyB0aGUgdGljayBtYXJrc1xuICAgIC8vIHJlbW92ZSB0aWNrbWFya3MgdGhhdCBkbyBub3QgbmVlZCB0byBiZSBkcmF3blxuICAgIHRpY2tzID0gdGlja3MuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ3F1YXJ0ZXInICYmICF0b19kcmF3LnF1YXJ0ZXIudGlja3MpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ21vbnRoJyAmJiAhdG9fZHJhdy5tb250aC50aWNrcykgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBnLnNlbGVjdEFsbChcImxpbmUudGljay1lbmRcIikuZGF0YSh0aWNrcykuZW50ZXIoKS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgdmFyIGxhc3QgPSBkLmxhc3QgPyBcIiB0aWNrbGFzdFwiIDogXCJcIjtcbiAgICAgICAgcmV0dXJuIFwidGljayB0aWNrZW5kIHRpY2tcIiArIGQudHlwZSArIGxhc3Q7XG4gICAgICB9KVxuICAgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBzY2FsZV8oZC5wZXJpb2QuZW5kKTt9KVxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxuICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBzY2FsZV8oZC5wZXJpb2QuZW5kKTt9KVxuICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB0aWNrX2xlbmd0aFtkLnR5cGVdO30pO1xuICAgIGcuc2VsZWN0QWxsKFwibGluZS50aWNrLXN0YXJ0XCIpLmRhdGEodGlja3MpLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBsYXN0ID0gZC5sYXN0ID8gXCIgdGlja2xhc3RcIiA6IFwiXCI7XG4gICAgICAgIHJldHVybiBcInRpY2sgdGlja3N0YXJ0IHRpY2tcIiArIGQudHlwZSArIGxhc3Q7XG4gICAgICB9KVxuICAgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBzY2FsZV8oZC5wZXJpb2Quc3RhcnQpO30pXG4gICAgICAuYXR0cihcInkxXCIsIDApXG4gICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHNjYWxlXyhkLnBlcmlvZC5zdGFydCk7fSlcbiAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gdGlja19sZW5ndGhbZC50eXBlXTt9KTtcblxuICAgIC8vIGRyYXcgdGhlIGxhYmVsc1xuICAgIC8vIHJlbW92ZSB0aWNrbWFya3MgdGhhdCBkbyBub3QgbmVlZCB0byBiZSBkcmF3blxuICAgIGNvbnNvbGUubG9nKHRvX2RyYXcpO1xuICAgIGNvbnNvbGUubG9nKHRpY2tzKTtcbiAgICB2YXIgZmlyc3RfeWVhciA9IHRydWU7XG4gICAgdGlja3MgPSB0aWNrcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKGQudHlwZSA9PSAncXVhcnRlcicgJiYgIXRvX2RyYXcucXVhcnRlci5sYWJlbHMpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ21vbnRoJyAmJiAhdG9fZHJhdy5tb250aC5sYWJlbHMpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkLnR5cGUgPT0gJ3llYXInICYmICF0b19kcmF3LnllYXIubGFiZWxzKSB7XG4gICAgICAgIHZhciBmaXJzdF9vcl9sYXN0ID0gZC5sYXN0IHx8IGZpcnN0X3llYXI7XG4gICAgICAgIGZpcnN0X3llYXIgPSBmYWxzZTtcbiAgICAgICAgaWYgKCFmaXJzdF9vcl9sYXN0KSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKFwidGlja3M9XCIsIHRpY2tzKTtcbiAgICBnLnNlbGVjdEFsbChcInRleHRcIikuZGF0YSh0aWNrcykuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidGlja2xhYmVsIHRpY2tsYWJlbFwiICsgZC50eXBlO30pXG4gICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gc2NhbGVfKGQuZGF0ZSk7fSlcbiAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB0aWNrX2xlbmd0aFtkLnR5cGVdO30pXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmIChkLnR5cGUgPT0gXCJtb250aFwiKSB7XG4gICAgICAgICAgcmV0dXJuIGQucGVyaW9kLnN0YXJ0LmZvcm1hdChcIk1NTVwiKS5jaGFyQXQoMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZC50eXBlID09IFwicXVhcnRlclwiKSB7XG4gICAgICAgICAgcmV0dXJuIFwiUVwiICsgZC5wZXJpb2Quc3RhcnQuZm9ybWF0KFwiUVwiKTtcbiAgICAgICAgfSBpZiAoZC50eXBlID09IFwieWVhclwiICYmIHRvX2RyYXcueWVhci5zbWFsbCkge1xuICAgICAgICAgIHJldHVybiAoZC5sYWJlbCArIFwiXCIpLnNsaWNlKC0yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICAgIH0pO1xuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0Xykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoaGVpZ2h0XyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciB0aWNrID0gMDtcbiAgICAgICAgaWYgKHNjYWxlXy5oYXNfbW9udGgpIHRpY2srKztcbiAgICAgICAgaWYgKHNjYWxlXy5oYXNfcXVhcnRlcikgdGljaysrO1xuICAgICAgICByZXR1cm4gc2V0dGluZ3MudGlja19sZW5ndGhbdGlja107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaGVpZ2h0XztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaGVpZ2h0XyA9IGhlaWdodDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIHIgPSBzY2FsZV8ucmFuZ2UoKTtcbiAgICAgIHJldHVybiByWzFdIC0gclswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NhbGVfLnJhbmdlKFswLCB3aWR0aF0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuYWNjZXB0ID0gZnVuY3Rpb24odmFyaWFibGUsIHNjaGVtYSkge1xuICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlLCBzY2hlbWEpO1xuICAgIHJldHVybiB2c2NoZW1hLnR5cGUgPT0gJ2RhdGUnIHx8IHZzY2hlbWEudHlwZSA9PSAncGVyaW9kJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGVfO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZV8gPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMuZG9tYWluID0gZnVuY3Rpb24oZGF0YSwgc2NoZW1hKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzY2FsZV8uZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkb21haW4gPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7IHJldHVybiBkW3ZhcmlhYmxlX107fSk7XG4gICAgICBzY2FsZV8uZG9tYWluKGRvbWFpbik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cblxuICBheGlzLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpY2tzID0gc2NhbGVfLnRpY2tzKCk7XG4gICAgcmV0dXJuIHRpY2tzLmZpbHRlcihmdW5jdGlvbihkKSB7IHJldHVybiBkLnR5cGUgPT0gXCJ5ZWFyXCI7fSk7XG4gIH07XG5cbiAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2Lmhhc093blByb3BlcnR5KFwiZGF0ZVwiKSAmJiB2Lmhhc093blByb3BlcnR5KFwicGVyaW9kXCIpKSB7XG4gICAgICAgIHJldHVybiBzY2FsZV8odik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2NhbGVfKHZbdmFyaWFibGVfXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzY2FsZV8odik7XG4gICAgfVxuICB9O1xuXG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmlmIChncnBoLmF4aXMgPT09IHVuZGVmaW5lZCkgZ3JwaC5heGlzID0ge307XG5ncnBoLmF4aXMucGVyaW9kID0gZ3JwaF9heGlzX3BlcmlvZCgpO1xuIiwiXG5mdW5jdGlvbiBncnBoX2F4aXNfcmVnaW9uKCkge1xuXG4gIHZhciB2YXJpYWJsZV87XG4gIHZhciB3aWR0aF8sIGhlaWdodF87XG4gIHZhciBtYXBfbG9hZGVkXztcbiAgdmFyIG1hcF87XG4gIHZhciBpbmRleF8gPSB7fTtcblxuICBmdW5jdGlvbiBheGlzKGcpIHtcbiAgfVxuXG4gIGF4aXMud2lkdGggPSBmdW5jdGlvbih3aWR0aCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gd2lkdGhfO1xuICAgIH0gZWxzZSB7XG4gICAgICB1cGRhdGVfcHJvamVjdGlvbl8gPSB1cGRhdGVfcHJvamVjdGlvbl8gfHwgd2lkdGhfICE9IHdpZHRoO1xuICAgICAgd2lkdGhfID0gd2lkdGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoZWlnaHQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodF87XG4gICAgfSBlbHNlIHtcbiAgICAgIHVwZGF0ZV9wcm9qZWN0aW9uXyA9IHVwZGF0ZV9wcm9qZWN0aW9uXyB8fCBoZWlnaHRfICE9IGhlaWdodDtcbiAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSAnc3RyaW5nJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGVfO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZV8gPSB2O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIC8vIFZhcmlhYmxlIGFuZCBmdW5jdGlvbiB0aGF0IGtlZXBzIHRyYWNrIG9mIHdoZXRoZXIgb3Igbm90IHRoZSBtYXAgaGFzIFxuICAvLyBmaW5pc2hlZCBsb2FkaW5nLiBUaGUgbWV0aG9kIGRvbWFpbigpIGxvYWRzIHRoZSBtYXAuIEhvd2V2ZXIsIHRoaXMgaGFwcGVuc1xuICAvLyBhc3luY2hyb25vdXNseS4gVGhlcmVmb3JlLCBpdCBpcyBwb3NzaWJsZSAoYW5kIG9mdGVuIGhhcHBlbnMpIHRoYXQgdGhlIG1hcFxuICAvLyBoYXMgbm90IHlldCBsb2FkZWQgd2hlbiBzY2FsZSgpIGFuZCB0cmFuc2Zvcm0oKSBhcmUgY2FsbGVkLiBUaGUgY29kZSBcbiAgLy8gY2FsbGluZyB0aGVzZSBtZXRob2RzIHRoZXJlZm9yZSBuZWVkcyB0byB3YWl0IHVudGlsIHRoZSBtYXAgaGFzIGxvYWRlZC4gXG4gIHZhciBtYXBfbG9hZGluZ18gPSBmYWxzZTsgXG4gIGF4aXMubWFwX2xvYWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhbWFwX2xvYWRpbmdfO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGxvYWRfbWFwKGRhdGEsIHNjaGVtYSwgY2FsbGJhY2spIHtcbiAgICBpZiAodmFyaWFibGVfID09PSB1bmRlZmluZWQpIHJldHVybiA7IC8vIFRPRE9cbiAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgaWYgKHZzY2hlbWEubWFwID09PSB1bmRlZmluZWQpIHJldHVybiA7IC8vIFRPRE9cbiAgICBpZiAodnNjaGVtYS5tYXAgPT0gbWFwX2xvYWRlZF8pIHJldHVybjsgXG4gICAgbWFwX2xvYWRpbmdfID0gdHJ1ZTtcbiAgICAvLyBUT0RPIGhhbmRsZSBlcnJvcnMgaW4gZDMuanNvblxuICAgIGQzLmpzb24odnNjaGVtYS5tYXAsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIG1hcF9sb2FkZWRfID0gdnNjaGVtYS5tYXA7XG4gICAgICBjYWxsYmFjayhqc29uKTtcbiAgICAgIG1hcF9sb2FkaW5nXyA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy9yZXR1cm4gc2NhbGUuZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvYWRfbWFwKGRhdGEsIHNjaGVtYSwgZnVuY3Rpb24obWFwKSB7XG4gICAgICAgIG1hcF8gPSBtYXA7XG4gICAgICAgIHVwZGF0ZV9wcm9qZWN0aW9uXyA9IHRydWU7XG4gICAgICAgIC8vIGJ1aWxkIGluZGV4IG1hcHBpbmcgcmVnaW9uIG5hbWUgb24gZmVhdHVyZXMgXG4gICAgICAgIHZhciB2c2NoZW1hID0gdmFyaWFibGVfc2NoZW1hKHZhcmlhYmxlXywgc2NoZW1hKTtcbiAgICAgICAgdmFyIHJlZ2lvbmlkID0gdnNjaGVtYS5yZWdpb25pZCB8fCBcImlkXCI7XG4gICAgICAgIGZvciAodmFyIGZlYXR1cmUgaW4gbWFwXy5mZWF0dXJlcykge1xuICAgICAgICAgIHZhciBuYW1lID0gbWFwXy5mZWF0dXJlc1tmZWF0dXJlXS5wcm9wZXJ0aWVzW3JlZ2lvbmlkXTtcbiAgICAgICAgICBpbmRleF9bbmFtZV0gPSBmZWF0dXJlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0JykgeyBcbiAgICAgIHJldHVybiBheGlzLnNjYWxlKHZbdmFyaWFibGVfXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF4aXMudXBkYXRlX3Byb2plY3Rpb24oKTtcbiAgICAgIHJldHVybiBwYXRoXyhtYXBfLmZlYXR1cmVzW2luZGV4X1t2XV0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBUaGUgcHJvamVjdGlvbi4gQ2FsY3VsYXRpbmcgdGhlIHNjYWxlIGFuZCB0cmFuc2xhdGlvbiBvZiB0aGUgcHJvamVjdGlvbiBcbiAgLy8gdGFrZXMgdGltZS4gVGhlcmVmb3JlLCB3ZSBvbmx5IHdhbnQgdG8gZG8gdGhhdCB3aGVuIG5lY2Vzc2FyeS4gXG4gIC8vIHVwZGF0ZV9wcm9qZWN0aW9uXyBrZWVwcyB0cmFjayBvZiB3aGV0aGVyIG9yIG5vdCB0aGUgcHJvamVjdGlvbiBuZWVkcyBcbiAgLy8gcmVjYWxjdWxhdGlvblxuICB2YXIgdXBkYXRlX3Byb2plY3Rpb25fID0gdHJ1ZTtcbiAgLy8gdGhlIHByb2plY3Rpb25cbiAgdmFyIHByb2plY3Rpb25fID0gZDMuZ2VvLnRyYW5zdmVyc2VNZXJjYXRvcigpXG4gICAgLnJvdGF0ZShbLTUuMzg3MjA2MjEsIC01Mi4xNTUxNzQ0MF0pLnNjYWxlKDEpLnRyYW5zbGF0ZShbMCwwXSk7XG4gIHZhciBwYXRoXyA9IGQzLmdlby5wYXRoKCkucHJvamVjdGlvbihwcm9qZWN0aW9uXyk7XG4gIC8vIGZ1bmN0aW9uIHRoYXQgcmVjYWxjdWxhdGVzIHRoZSBzY2FsZSBhbmQgdHJhbnNsYXRpb24gb2YgdGhlIHByb2plY3Rpb25cbiAgYXhpcy51cGRhdGVfcHJvamVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh1cGRhdGVfcHJvamVjdGlvbl8gJiYgbWFwXykge1xuICAgICAgcHJvamVjdGlvbl8uc2NhbGUoMSkudHJhbnNsYXRlKFswLDBdKTtcbiAgICAgIHBhdGhfID0gZDMuZ2VvLnBhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb25fKTtcbiAgICAgIHZhciBib3VuZHMgPSBwYXRoXy5ib3VuZHMobWFwXyk7XG4gICAgICB2YXIgc2NhbGUgID0gMC45NSAvIE1hdGgubWF4KChib3VuZHNbMV1bMF0gLSBib3VuZHNbMF1bMF0pIC8gd2lkdGhfLCBcbiAgICAgICAgICAgICAgICAgIChib3VuZHNbMV1bMV0gLSBib3VuZHNbMF1bMV0pIC8gaGVpZ2h0Xyk7XG4gICAgICB2YXIgdHJhbnNsID0gWyh3aWR0aF8gLSBzY2FsZSAqIChib3VuZHNbMV1bMF0gKyBib3VuZHNbMF1bMF0pKSAvIDIsIFxuICAgICAgICAgICAgICAgICAgKGhlaWdodF8gLSBzY2FsZSAqIChib3VuZHNbMV1bMV0gKyBib3VuZHNbMF1bMV0pKSAvIDJdO1xuICAgICAgcHJvamVjdGlvbl8uc2NhbGUoc2NhbGUpLnRyYW5zbGF0ZSh0cmFuc2wpO1xuICAgICAgdXBkYXRlX3Byb2plY3Rpb25fID0gZmFsc2U7XG4gICAgfVxuICB9O1xuXG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbi8vIEEgZnVuY3Rpb24gZXhwZWN0aW5nIHR3byBmdW5jdGlvbnMuIFRoZSBzZWNvbmQgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIFxuLy8gZmlyc3QgZnVuY3Rpb24gcmV0dXJucyB0cnVlLiBXaGVuIHRoZSBmaXJzdCBmdW5jdGlvbiBkb2VzIG5vdCByZXR1cm4gdHJ1ZVxuLy8gd2Ugd2FpdCBmb3IgMTAwbXMgYW5kIHRyeSBhZ2Fpbi4gXG52YXIgd2FpdF9mb3IgPSBmdW5jdGlvbihtLCBmKSB7XG4gIGlmIChtKCkpIHtcbiAgICBmKCk7XG4gIH0gZWxzZSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgd2FpdF9mb3IobSwgZik7fSwgMTAwKTtcbiAgfVxufTtcblxuaWYgKGdycGguYXhpcyA9PT0gdW5kZWZpbmVkKSBncnBoLmF4aXMgPSB7fTtcbmdycGguYXhpcy5saW5lYXIgPSBncnBoX2F4aXNfbGluZWFyKCk7XG5cbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX3NpemUoKSB7XG5cbiAgdmFyIHZhcmlhYmxlXztcbiAgdmFyIHdpZHRoLCBoZWlnaHQ7XG4gIHZhciBzY2FsZSA9IGdycGhfc2NhbGVfc2l6ZSgpO1xuXG4gIGZ1bmN0aW9uIGF4aXMoZykge1xuICB9XG5cbiAgYXhpcy53aWR0aCA9IGZ1bmN0aW9uKHcpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHdpZHRoO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aWR0aCA9IHc7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodCA9IGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSAnbnVtYmVyJztcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFyaWFibGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhcmlhYmxlID0gdjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmRvbWFpbiA9IGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2NhbGUuZG9tYWluKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2YXJpYWJsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcztcbiAgICAgIHNjYWxlLmRvbWFpbihkMy5leHRlbnQoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZFt2YXJpYWJsZV07fSkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2NhbGUudGlja3MoKTtcbiAgfTtcblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24odikge1xuICAgIGlmICh0eXBlb2YgdiA9PSAnb2JqZWN0JykgeyBcbiAgICAgIHJldHVybiBheGlzLnNjYWxlKHZbdmFyaWFibGVdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNjYWxlKHYpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gYXhpcztcbn1cblxuaWYgKGdycGguYXhpcyA9PT0gdW5kZWZpbmVkKSBncnBoLmF4aXMgPSB7fTtcbmdycGguYXhpcy5zaXplID0gZ3JwaF9heGlzX3NpemUoKTtcblxuIiwiXG5mdW5jdGlvbiBncnBoX2F4aXNfc3BsaXQoKSB7XG5cbiAgdmFyIHZhcmlhYmxlXztcbiAgdmFyIHdpZHRoXywgaGVpZ2h0XztcbiAgdmFyIGRvbWFpbl87XG4gIHZhciB0aWNrc187XG4gIHZhciBzZXR0aW5nc18gPSB7XG4gIH07XG5cbiAgZnVuY3Rpb24gYXhpcyhnKSB7XG4gIH1cblxuICBheGlzLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHdpZHRoXztcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGhfID0gd2lkdGg7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5oZWlnaHQgPSBmdW5jdGlvbihoZWlnaHQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodF87XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlaWdodF8gPSBoZWlnaHQ7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgdmFyIHZzY2hlbWEgPSB2YXJpYWJsZV9zY2hlbWEodmFyaWFibGUsIHNjaGVtYSk7XG4gICAgcmV0dXJuIHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIgfHwgdnNjaGVtYS50eXBlID09IFwicGVyaW9kXCI7XG4gIH07XG5cbiAgYXhpcy52YXJpYWJsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhcmlhYmxlXztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGVfID0gdjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcbiBcbiAgYXhpcy5kb21haW4gPSBmdW5jdGlvbihkYXRhLCBzY2hlbWEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRvbWFpbl87XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2YXJpYWJsZV8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgdnNjaGVtYSA9IHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgICB2YXIgY2F0ZWdvcmllcyA9IFtdO1xuICAgICAgaWYgKHZzY2hlbWEudHlwZSA9PSBcImNhdGVnb3JpY2FsXCIpIHtcbiAgICAgICAgY2F0ZWdvcmllcyA9IHZzY2hlbWEuY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lOyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWxzID0gZGF0YS5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZFt2YXJpYWJsZV9dO30pLnNvcnQoKTtcbiAgICAgICAgdmFyIHByZXY7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFscy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGlmICh2YWxzW2ldICE9IHByZXYpIGNhdGVnb3JpZXMucHVzaChcIlwiICsgdmFsc1tpXSk7XG4gICAgICAgICAgcHJldiA9IHZhbHNbaV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRvbWFpbl8gPSBjYXRlZ29yaWVzO1xuICAgICAgdmFyIGZvcm1hdCA9IHZhcmlhYmxlX3ZhbHVlX2Zvcm1hdHRlcih2YXJpYWJsZV8sIHNjaGVtYSk7XG4gICAgICB0aWNrc18gPSBkb21haW5fLm1hcChmb3JtYXQpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGlja3NfO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIGRvbWFpbl8uaW5kZXhPZih2KTtcbiAgfTtcblxuICByZXR1cm4gYXhpcztcbn1cbiIsIlxuZnVuY3Rpb24gZ3JwaF9heGlzX3N3aXRjaChheGVzKSB7XG5cbiAgdmFyIHR5cGUgPSAwO1xuXG4gIHZhciBheGlzID0gZnVuY3Rpb24oZykge1xuICAgIHJldHVybiBheGVzW3R5cGVdKGcpO1xuICB9O1xuXG4gIGF4aXMuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0Xykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS5oZWlnaHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaT0wOyBpPGF4ZXMubGVuZ3RoOyArK2kpIGF4ZXNbaV0uaGVpZ2h0KGhlaWdodF8pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGF4aXMud2lkdGggPSBmdW5jdGlvbih3aWR0aCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS53aWR0aCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8YXhlcy5sZW5ndGg7ICsraSkgYXhlc1tpXS53aWR0aCh3aWR0aCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgYXhpcy5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZSwgc2NoZW1hKSB7XG4gICAgZm9yICh2YXIgaT0wOyBpPGF4ZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChheGVzW2ldLmFjY2VwdCh2YXJpYWJsZSwgc2NoZW1hKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBheGlzLnZhcmlhYmxlID0gZnVuY3Rpb24odikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS52YXJpYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8YXhlcy5sZW5ndGg7ICsraSkgYXhlc1tpXS52YXJpYWJsZSh2KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBheGlzLmRvbWFpbiA9IGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYXhlc1t0eXBlXS52YXJpYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGlzLnZhcmlhYmxlKCk7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8YXhlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAoYXhlc1tpXS5hY2NlcHQodmFyaWFibGUsIHNjaGVtYSkpIHtcbiAgICAgICAgICB0eXBlID0gaTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXhlc1t0eXBlXS5kb21haW4oZGF0YSwgc2NoZW1hKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXhlc1t0eXBlXS50aWNrcygpO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIGF4ZXNbdHlwZV0uc2NhbGUodik7XG4gIH07XG5cbiAgcmV0dXJuIGF4aXM7XG59XG4iLCJcbmZ1bmN0aW9uIHZhcmlhYmxlX3NjaGVtYSh2YXJpYWJsZSwgc2NoZW1hKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2NoZW1hLmZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzY2hlbWEuZmllbGRzW2ldLm5hbWUgPT0gdmFyaWFibGUpIFxuICAgICAgcmV0dXJuIHNjaGVtYS5maWVsZHNbaV07XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gdmFyaWFibGVfdmFsdWVfZm9ybWF0dGVyKHZhcmlhYmxlLCBzY2hlbWEpe1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNjaGVtYS5maWVsZHMubGVuZ3RoOyBpKyspe1xuICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgICBpZiAoZmllbGQubmFtZSA9PSB2YXJpYWJsZSl7XG4gICAgICBzd2l0Y2goZmllbGQudHlwZSl7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjp7XG4gICAgICAgICAgcmV0dXJuIG51bWJlcl9mb3JtYXR0ZXIoZmllbGQpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgXCJjYXRlZ29yaWNhbFwiOntcbiAgICAgICAgICByZXR1cm4gY2F0ZWdvcmljYWxfZm9ybWF0dGVyKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFwic3RyaW5nXCI6e1xuICAgICAgICAgIHJldHVybiBjYXRlZ29yaWNhbF9mb3JtYXR0ZXIoZmllbGQpO1xuICAgICAgICB9ICAgICAgICBcbiAgICAgICAgZGVmYXVsdDp7XG4gICAgICAgICAgcmV0dXJuIGRlZmF1bHRfZm9ybWF0dGVyKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0X2Zvcm1hdHRlcigpO1xufVxuLy8gY3JlYXRlcyBhIGZvcm1hdHRlciBmb3IgcHJldHR5IHByaW50aW5nIHZhbHVlcyBmb3IgYSBzcGVjaWZpYyBmaWVsZCBcbmZ1bmN0aW9uIHZhbHVlX2Zvcm1hdHRlcihzY2hlbWEpe1xuICB2YXIgZm9ybWF0dGVycyA9IHt9O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNjaGVtYS5maWVsZHMubGVuZ3RoOyBpKyspe1xuICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgc3dpdGNoKGZpZWxkLnR5cGUpe1xuICAgICAgY2FzZSBcIm51bWJlclwiOntcbiAgICAgICAgZm9ybWF0dGVyc1tmaWVsZC5uYW1lXSA9IG51bWJlcl9mb3JtYXR0ZXIoZmllbGQpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgXCJjYXRlZ29yaWNhbFwiOntcbiAgICAgICAgZm9ybWF0dGVyc1tmaWVsZC5uYW1lXSA9IGNhdGVnb3JpY2FsX2Zvcm1hdHRlcihmaWVsZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBcInN0cmluZ1wiOntcbiAgICAgICAgZm9ybWF0dGVyc1tmaWVsZC5uYW1lXSA9IGNhdGVnb3JpY2FsX2Zvcm1hdHRlcihmaWVsZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDp7XG4gICAgICAgIGZvcm1hdHRlcnNbZmllbGQubmFtZV0gPSBkZWZhdWx0X2Zvcm1hdHRlcihmaWVsZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdHVtLCBuYW1lKXtcbiAgICByZXR1cm4gZm9ybWF0dGVyc1tuYW1lXShkYXR1bVtuYW1lXSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRfZm9ybWF0dGVyKGZpZWxkKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKXtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNhdGVnb3JpY2FsX2Zvcm1hdHRlcihmaWVsZCl7XG4gIHZhciBjYXRfdGl0bGVzID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGQuY2F0ZWdvcmllcy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIGNhdCA9IGZpZWxkLmNhdGVnb3JpZXNbaV07XG4gICAgY2F0X3RpdGxlc1tjYXQubmFtZV0gPSBjYXQudGl0bGUgfHwgY2F0Lm5hbWU7XG4gIH1cbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKXtcbiAgICByZXR1cm4gY2F0X3RpdGxlc1t2YWx1ZV0gfHwgXCIoXCIgKyB2YWx1ZSArIFwiKVwiO1xuICB9O1xufVxuXG5GQUNUT1IgPSAveCA/KFxcZCA/XFxkKikoLiopLztcblxuZnVuY3Rpb24gbnVtYmVyX2Zvcm1hdHRlcihmaWVsZCl7XG4gIC8vVE9ETyB1c2Ugcm91bmRpbmc/XG4gIHZhciB1bml0ID0gZmllbGQudW5pdCB8fCBcIlwiO1xuICB2YXIgZmFjdG9yID0gMTtcbiAgXG4gIGlmIChGQUNUT1IudGVzdCh1bml0KSl7XG4gICAgdmFyIG0gPSBGQUNUT1IuZXhlYyh1bml0KTtcbiAgICBmYWN0b3IgPSBwYXJzZUludChtWzFdLnJlcGxhY2UoXCIgXCIsIFwiXCIpKTtcbiAgICB1bml0ID0gbVsyXTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgcmV0dXJuIChmYWN0b3IqdmFsdWUpLnRvTG9jYWxlU3RyaW5nKCkgKyBcIiBcIiArIHVuaXQgfHwgXCItXCI7XG4gIH07XG59XG4iLCJcblxuZnVuY3Rpb24gZGF0ZV9wZXJpb2Qoc3RyKSB7XG5cbiAgZnVuY3Rpb24gaXNfeWVhcihwZXJpb2QpIHtcbiAgICAvLyBzdGFydGluZyBtb250aCBzaG91bGQgYmUgMFxuICAgIGlmIChwZXJpb2Quc3RhcnQubW9udGgoKSAhPT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIHN0YXJ0aW5nIGRheSBvZiBtb250aCBzaG91bGQgYmUgMVxuICAgIGlmIChwZXJpb2Quc3RhcnQuZGF0ZSgpICE9IDEpIHJldHVybiBmYWxzZTtcbiAgICAvLyBsZW5ndGggc2hvdWxkIGJlIDEgeWVhclxuICAgIHJldHVybiBwZXJpb2QubGVuZ3RoKFwieWVhcnNcIikgPT0gMTtcbiAgfVxuICBmdW5jdGlvbiBpc19xdWFydGVyKHBlcmlvZCkge1xuICAgIC8vIHN0YXJ0aW5nIG1vbnRoIHNob3VsZCBiZSAwLCAzLCA2LCBvciA5XG4gICAgaWYgKChwZXJpb2Quc3RhcnQubW9udGgoKSAlIDMpICE9PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gc3RhcnRpbmcgZGF5IG9mIG1vbnRoIHNob3VsZCBiZSAxXG4gICAgaWYgKHBlcmlvZC5zdGFydC5kYXRlKCkgIT0gMSkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIGxlbmd0aCBzaG91bGQgYmUgMyBtb250aHNcbiAgICByZXR1cm4gcGVyaW9kLmxlbmd0aChcIm1vbnRoc1wiKSA9PSAzO1xuICB9XG4gIGZ1bmN0aW9uIGlzX21vbnRoKHBlcmlvZCkge1xuICAgIC8vIHN0YXJ0aW5nIGRheSBvZiBtb250aCBzaG91bGQgYmUgMVxuICAgIGlmIChwZXJpb2Quc3RhcnQuZGF0ZSgpICE9IDEpIHJldHVybiBmYWxzZTtcbiAgICAvLyBsZW5ndGggc2hvdWxkIGJlIDEgbW9udGhzXG4gICAgcmV0dXJuIHBlcmlvZC5sZW5ndGgoXCJtb250aHNcIikgPT0gMTtcbiAgfVxuXG4gIHZhciBiYXNpY195ZWFyX3JlZ2V4cCA9IC9eKFxcZHs0fSkkLztcbiAgdmFyIGJhc2ljX21vbnRoX3JlZ2V4cCA9IC9eKFxcZHs0fSlbTW0tXXsxfShcXGR7MSwyfSkkLztcbiAgdmFyIGJhc2ljX3F1YXJ0ZXJfcmVnZXhwID0gL14oXFxkezR9KVtRcV17MX0oXFxkezEsMn0pJC87XG5cbiAgdmFyIHQwLCBkdCwgcCwgdCwgeWVhcjtcbiAgaWYgKGJhc2ljX3llYXJfcmVnZXhwLnRlc3Qoc3RyKSkge1xuICAgIHN0ciA9IGJhc2ljX3llYXJfcmVnZXhwLmV4ZWMoc3RyKTtcbiAgICB5ZWFyID0gK3N0clsxXTtcbiAgICB0MCA9IG1vbWVudC51dGMoWytzdHJbMV1dKTtcbiAgICBkdCA9IG1vbWVudC5kdXJhdGlvbigxLCBcInllYXJcIik7XG4gICAgcCAgPSBkdC5hZnRlck1vbWVudCh0MCk7XG4gICAgdCAgPSB0MC5hZGQobW9tZW50LmR1cmF0aW9uKHAubGVuZ3RoKCkvMikpO1xuICAgIHJldHVybiB7dHlwZTogXCJ5ZWFyXCIsIGRhdGU6IHQsIHBlcmlvZDogcH07XG4gIH0gZWxzZSBpZiAoYmFzaWNfbW9udGhfcmVnZXhwLnRlc3Qoc3RyKSkge1xuICAgIHN0ciA9IGJhc2ljX21vbnRoX3JlZ2V4cC5leGVjKHN0cik7XG4gICAgdDAgPSBtb21lbnQudXRjKFsrc3RyWzFdLCArc3RyWzJdLTFdKTtcbiAgICBkdCA9IG1vbWVudC5kdXJhdGlvbigxLCBcIm1vbnRoXCIpO1xuICAgIHAgID0gZHQuYWZ0ZXJNb21lbnQodDApO1xuICAgIHQgID0gdDAuYWRkKG1vbWVudC5kdXJhdGlvbihwLmxlbmd0aCgpLzIpKTtcbiAgICByZXR1cm4ge3R5cGU6IFwibW9udGhcIiwgZGF0ZTogdCwgcGVyaW9kOiBwfTtcbiAgfSBlbHNlIGlmIChiYXNpY19xdWFydGVyX3JlZ2V4cC50ZXN0KHN0cikpIHtcbiAgICBzdHIgPSBiYXNpY19xdWFydGVyX3JlZ2V4cC5leGVjKHN0cik7XG4gICAgeWVhciAgICA9ICtzdHJbMV07XG4gICAgdmFyIHF1YXJ0ZXIgPSArc3RyWzJdO1xuICAgIHQwID0gbW9tZW50LnV0YyhbK3N0clsxXSwgKCtzdHJbMl0tMSkqM10pO1xuICAgIGR0ID0gbW9tZW50LmR1cmF0aW9uKDMsIFwibW9udGhcIik7XG4gICAgcCAgPSBkdC5hZnRlck1vbWVudCh0MCk7XG4gICAgdCAgPSB0MC5hZGQobW9tZW50LmR1cmF0aW9uKHAubGVuZ3RoKCkvMikpO1xuICAgIHJldHVybiB7dHlwZTogXCJxdWFydGVyXCIsIGRhdGU6IHQsIHBlcmlvZDogcH07XG4gIH0gZWxzZSBpZiAodHlwZW9mKHN0cikgPT0gXCJzdHJpbmdcIikge1xuICAgIHN0ciA9IHN0ci5zcGxpdChcIi9cIik7XG4gICAgdDAgICA9IG1vbWVudC51dGMoc3RyWzBdLCBtb21lbnQuSVNPXzg2MDEpO1xuICAgIGlmIChzdHIubGVuZ3RoID09IDEpIHtcbiAgICAgIGR0ID0gbW9tZW50LmR1cmF0aW9uKDApO1xuICAgICAgcmV0dXJuIHt0eXBlOiBcImRhdGVcIiwgZGF0ZTogdDAsIHBlcmlvZDogZHQuYWZ0ZXJNb21lbnQodDApfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZHQgPSBtb21lbnQuZHVyYXRpb24oc3RyWzFdKTtcbiAgICAgIHAgID0gZHQuYWZ0ZXJNb21lbnQodDApO1xuICAgICAgdCAgPSB0MC5hZGQobW9tZW50LmR1cmF0aW9uKHAubGVuZ3RoKCkvMikpO1xuICAgICAgdmFyIHR5cGUgPSBcInBlcmlvZFwiO1xuICAgICAgaWYgKGlzX3llYXIocCkpIHtcbiAgICAgICAgdHlwZSA9IFwieWVhclwiO1xuICAgICAgfSBlbHNlIGlmIChpc19xdWFydGVyKHApKSB7XG4gICAgICAgIHR5cGUgPSBcInF1YXJ0ZXJcIjtcbiAgICAgIH0gZWxzZSBpZiAoaXNfbW9udGgocCkpIHtcbiAgICAgICAgdHlwZSA9IFwibW9udGhcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7dHlwZTogdHlwZSwgZGF0ZTogdCwgcGVyaW9kOiBwfTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdDAgICA9IG1vbWVudC51dGMoc3RyKTtcbiAgICBkdCA9IG1vbWVudC5kdXJhdGlvbigwKTtcbiAgICByZXR1cm4ge3R5cGU6IFwiZGF0ZVwiLCBkYXRlOiB0MCwgcGVyaW9kOiBkdC5hZnRlck1vbWVudCh0MCl9O1xuICB9XG59XG4iLCJcbmZ1bmN0aW9uIGdycGhfZ2VuZXJpY19ncmFwaChheGVzLCBkaXNwYXRjaCwgdHlwZSwgZ3JhcGhfcGFuZWwpIHtcblxuICB2YXIgZHVtbXlfID0gZDMuc2VsZWN0KFwiYm9keVwiKS5hcHBlbmQoXCJzdmdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsIFwiZHVtbXkgZ3JhcGggZ3JhcGgtXCIgKyB0eXBlKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgMCkuYXR0cihcImhlaWdodFwiLCAwKVxuICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gIHZhciBsYWJlbF9zaXplXyA9IGdycGhfbGFiZWxfc2l6ZShkdW1teV8pO1xuXG5cbiAgdmFyIGdyYXBoID0gZ3JwaF9ncmFwaChheGVzLCBkaXNwYXRjaCwgZnVuY3Rpb24oZykge1xuICAgIGZ1bmN0aW9uIG5lc3RfY29sdW1uKGQpIHtcbiAgICAgIHJldHVybiBheGVzLmNvbHVtbi52YXJpYWJsZSgpID8gZFtheGVzLmNvbHVtbi52YXJpYWJsZSgpXSA6IDE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG5lc3Rfcm93KGQpIHtcbiAgICAgIHJldHVybiBheGVzLnJvdy52YXJpYWJsZSgpID8gZFtheGVzLnJvdy52YXJpYWJsZSgpXSA6IDE7XG4gICAgfVxuICAgIC8vIHNldHVwIGF4ZXNcbiAgICBmb3IgKHZhciBheGlzIGluIGF4ZXMpIGF4ZXNbYXhpc10uZG9tYWluKGdyYXBoLmRhdGEoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgIC8vIGRldGVybWluZSBudW1iZXIgb2Ygcm93cyBhbmQgY29sdW1uc1xuICAgIHZhciBuY29sID0gYXhlcy5jb2x1bW4udmFyaWFibGUoKSA/IGF4ZXMuY29sdW1uLnRpY2tzKCkubGVuZ3RoIDogMTtcbiAgICB2YXIgbnJvdyA9IGF4ZXMucm93LnZhcmlhYmxlKCkgPyBheGVzLnJvdy50aWNrcygpLmxlbmd0aCA6IDE7XG4gICAgLy8gZ2V0IGxhYmVscyBhbmQgZGV0ZXJtaW5lIHRoZWlyIGhlaWdodFxuICAgIHZhciB2c2NoZW1heCA9IHZhcmlhYmxlX3NjaGVtYShheGVzLngudmFyaWFibGUoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgIHZhciB4bGFiZWwgPSB2c2NoZW1heC50aXRsZTtcbiAgICB2YXIgbGFiZWxfaGVpZ2h0ID0gbGFiZWxfc2l6ZV8uaGVpZ2h0KHhsYWJlbCkgKyBzZXR0aW5ncygnbGFiZWxfcGFkZGluZycpO1xuICAgIHZhciB2c2NoZW1heSA9IHZhcmlhYmxlX3NjaGVtYShheGVzLnkudmFyaWFibGUoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgIHZhciB5bGFiZWwgPSB2c2NoZW1heS50aXRsZTtcbiAgICAvLyBzZXQgdGhlIHdpZHRoLCBoZWlnaHQgZW5kIGRvbWFpbiBvZiB0aGUgeC0gYW5kIHktYXhlcy4gV2UgbmVlZCBzb21lIFxuICAgIC8vIGl0ZXJhdGlvbnMgZm9yIHRoaXMsIGFzIHRoZSBoZWlnaHQgb2YgdGhlIHktYXhpcyBkZXBlbmRzIG9mIHRoZSBoZWlnaHRcbiAgICAvLyBvZiB0aGUgeC1heGlzLCB3aGljaCBkZXBlbmRzIG9uIHRoZSBsYWJlbHMgb2YgdGhlIHgtYXhpcywgd2hpY2ggZGVwZW5kc1xuICAgIC8vIG9uIHRoZSB3aWR0aCBvZiB0aGUgeC1heGlzLCBldGMuIFxuICAgIHZhciByb3dsYWJlbF93aWR0aCA9IGF4ZXMucm93LnZhcmlhYmxlKCkgPyAzKmxhYmVsX2hlaWdodCA6IDA7XG4gICAgdmFyIGNvbHVtbmxhYmVsX2hlaWdodCA9IGF4ZXMuY29sdW1uLnZhcmlhYmxlKCkgPyAzKmxhYmVsX2hlaWdodCA6IDA7XG4gICAgdmFyIHcsIGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAyOyArK2kpIHtcbiAgICAgIHcgPSBncmFwaC53aWR0aCgpIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVsxXSAtIHNldHRpbmdzKCdwYWRkaW5nJylbM10gLSBcbiAgICAgICAgYXhlcy55LndpZHRoKCkgLSBsYWJlbF9oZWlnaHQgLSByb3dsYWJlbF93aWR0aDtcbiAgICAgIHcgPSAodyAtIChuY29sLTEpKnNldHRpbmdzKCdzZXAnKSkgLyBuY29sO1xuICAgICAgYXhlcy54LndpZHRoKHcpLmRvbWFpbihncmFwaC5kYXRhKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICAgIGggPSBncmFwaC5oZWlnaHQoKSAtIHNldHRpbmdzKCdwYWRkaW5nJylbMF0gLSBzZXR0aW5ncygncGFkZGluZycpWzJdIC0gXG4gICAgICAgIGF4ZXMueC5oZWlnaHQoKSAtIGxhYmVsX2hlaWdodCAtIGNvbHVtbmxhYmVsX2hlaWdodDtcbiAgICAgIGggPSAoaCAtIChucm93LTEpKnNldHRpbmdzKCdzZXAnKSkgLyBucm93O1xuICAgICAgYXhlcy55LmhlaWdodChoKS5kb21haW4oZ3JhcGguZGF0YSgpLCBncmFwaC5zY2hlbWEoKSk7XG4gICAgfVxuICAgIHZhciBsID0gYXhlcy55LndpZHRoKCkgKyBzZXR0aW5ncygncGFkZGluZycpWzFdICsgbGFiZWxfaGVpZ2h0O1xuICAgIHZhciB0ICA9IHNldHRpbmdzKCdwYWRkaW5nJylbMl0gKyBjb2x1bW5sYWJlbF9oZWlnaHQ7XG4gICAgLy8gY3JlYXRlIGdyb3VwIGNvbnRhaW5pbmcgY29tcGxldGUgZ3JhcGhcbiAgICBnID0gZy5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcImdyYXBoIGdyYXBoLVwiICsgdHlwZSk7XG4gICAgLy8gZHJhdyBsYWJlbHNcbiAgICB2YXIgeWNlbnRlciA9IHQgKyAwLjUqKGdyYXBoLmhlaWdodCgpIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVswXSAtIHNldHRpbmdzKCdwYWRkaW5nJylbMl0gLSBcbiAgICAgICAgYXhlcy54LmhlaWdodCgpIC0gbGFiZWxfaGVpZ2h0KTtcbiAgICB2YXIgeGNlbnRlciA9IGwgKyAwLjUqKGdyYXBoLndpZHRoKCkgLSBzZXR0aW5ncygncGFkZGluZycpWzFdIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVszXSAtIFxuICAgICAgICBheGVzLnkud2lkdGgoKSAtIGxhYmVsX2hlaWdodCk7XG4gICAgZy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsIGxhYmVsLXlcIilcbiAgICAgIC5hdHRyKFwieFwiLCBzZXR0aW5ncygncGFkZGluZycpWzFdKS5hdHRyKFwieVwiLCB5Y2VudGVyKVxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKS50ZXh0KHlsYWJlbClcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDkwIFwiICsgc2V0dGluZ3MoJ3BhZGRpbmcnKVsxXSArIFwiIFwiICsgeWNlbnRlciArIFwiKVwiKTtcbiAgICBnLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwibGFiZWwgbGFiZWwteFwiKVxuICAgICAgLmF0dHIoXCJ4XCIsIHhjZW50ZXIpLmF0dHIoXCJ5XCIsIGdyYXBoLmhlaWdodCgpLXNldHRpbmdzKCdwYWRkaW5nJylbMF0pXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLnRleHQoeGxhYmVsKTtcbiAgICBpZiAoYXhlcy5yb3cudmFyaWFibGUoKSkge1xuICAgICAgdmFyIHhyb3cgPSBncmFwaC53aWR0aCgpIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVszXSAtIGxhYmVsX2hlaWdodDtcbiAgICAgIHZhciB2c2NoZW1hcm93ID0gdmFyaWFibGVfc2NoZW1hKGF4ZXMucm93LnZhcmlhYmxlKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICAgIHZhciByb3dsYWJlbCA9IHZzY2hlbWFyb3cudGl0bGU7XG4gICAgICBnLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwibGFiZWwgbGFiZWwteVwiKVxuICAgICAgICAuYXR0cihcInhcIiwgeHJvdykuYXR0cihcInlcIiwgeWNlbnRlcilcbiAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKS50ZXh0KHJvd2xhYmVsKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSg5MCBcIiArIHhyb3cgKyBcIiBcIiArIHljZW50ZXIgKyBcIilcIik7XG4gICAgfVxuICAgIGlmIChheGVzLmNvbHVtbi52YXJpYWJsZSgpKSB7XG4gICAgICB2YXIgdnNjaGVtYWNvbHVtbiA9IHZhcmlhYmxlX3NjaGVtYShheGVzLmNvbHVtbi52YXJpYWJsZSgpLCBncmFwaC5zY2hlbWEoKSk7XG4gICAgICB2YXIgY29sdW1ubGFiZWwgPSB2c2NoZW1hY29sdW1uLnRpdGxlO1xuICAgICAgZy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsIGxhYmVsLXlcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIHhjZW50ZXIpLmF0dHIoXCJ5XCIsIHNldHRpbmdzKFwicGFkZGluZ1wiKVsyXSkuYXR0cihcImR5XCIsIFwiMC43MWVtXCIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikudGV4dChjb2x1bW5sYWJlbCk7XG4gICAgfVxuICAgIC8vIGNyZWF0ZSBlYWNoIG9mIHRoZSBwYW5lbHNcbiAgICB2YXIgZCA9IGQzLm5lc3QoKS5rZXkobmVzdF9jb2x1bW4pLmtleShuZXN0X3JvdykuZW50cmllcyhncmFwaC5kYXRhKCkpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBkLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgZGogPSBkW2ldLnZhbHVlcztcbiAgICAgIHQgID0gc2V0dGluZ3MoJ3BhZGRpbmcnKVsyXSArIGNvbHVtbmxhYmVsX2hlaWdodDtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGoubGVuZ3RoOyArK2opIHtcbiAgICAgICAgLy8gZHJhdyB4LWF4aXNcbiAgICAgICAgaWYgKGogPT0gKGRqLmxlbmd0aC0xKSkge1xuICAgICAgICAgIGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJheGlzIGF4aXMteFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBsICsgXCIsXCIgKyAodCArIGgpICsgXCIpXCIpLmNhbGwoYXhlcy54KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkcmF3IHktYXhpc1xuICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJheGlzIGF4aXMteVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAobCAtIGF4ZXMueS53aWR0aCgpKSArIFwiLFwiICsgdCArIFwiKVwiKVxuICAgICAgICAgICAgLmNhbGwoYXhlcy55KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkcmF3IHJvdyBsYWJlbHNcbiAgICAgICAgaWYgKGkgPT0gKGQubGVuZ3RoLTEpICYmIGF4ZXMucm93LnZhcmlhYmxlKCkpIHtcbiAgICAgICAgICB2YXIgcm93dGljayA9IGF4ZXMucm93LnRpY2tzKClbal07XG4gICAgICAgICAgdmFyIGdyb3cgPSBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpcyBheGlzLXJvd1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAobCArIHcpICsgXCIsXCIgKyB0ICsgXCIpXCIpO1xuICAgICAgICAgIGdyb3cuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGxhYmVsX2hlaWdodCArIDIqc2V0dGluZ3MoXCJ0aWNrX3BhZGRpbmdcIikpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoKTtcbiAgICAgICAgICBncm93LmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwidGlja2xhYmVsXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgMCkuYXR0cihcInlcIiwgaC8yKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoOTAgXCIgKyBcbiAgICAgICAgICAgICAgKGxhYmVsX2hlaWdodCAtIHNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKSArIFwiIFwiICsgaC8yICsgXCIpXCIpXG4gICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpLmF0dHIoXCJkeVwiLCBcIjAuMzVlbVwiKVxuICAgICAgICAgICAgLnRleHQocm93dGljayk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZHJhdyBjb2x1bW4gbGFiZWxzXG4gICAgICAgIGlmIChqID09PSAwICYmIGF4ZXMuY29sdW1uLnZhcmlhYmxlKCkpIHtcbiAgICAgICAgICB2YXIgY29sdW1udGljayA9IGF4ZXMuY29sdW1uLnRpY2tzKClbaV07XG4gICAgICAgICAgdmFyIGNvbHRpY2toID0gbGFiZWxfaGVpZ2h0ICsgMipzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKTtcbiAgICAgICAgICB2YXIgZ2NvbHVtbiA9IGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJheGlzIGF4aXMtY29sdW1uXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGwgKyBcIixcIiArICh0IC0gY29sdGlja2gpICsgXCIpXCIpO1xuICAgICAgICAgIGdjb2x1bW4uYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHcpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBsYWJlbF9oZWlnaHQgKyAyKnNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKTtcbiAgICAgICAgICBnY29sdW1uLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwidGlja2xhYmVsXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgdy8yKS5hdHRyKFwieVwiLCBzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSlcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikuYXR0cihcImR5XCIsIFwiMC43MWVtXCIpXG4gICAgICAgICAgICAudGV4dChjb2x1bW50aWNrKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkcmF3IGJveCBmb3IgZ3JhcGhcbiAgICAgICAgdmFyIGdyID0gZy5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcInBhbmVsXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBsICsgXCIsXCIgKyB0ICsgXCIpXCIpO1xuICAgICAgICBnci5hcHBlbmQoXCJyZWN0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHcpLmF0dHIoXCJoZWlnaHRcIiwgaCk7XG4gICAgICAgIC8vIGRyYXcgZ3JpZFxuICAgICAgICB2YXIgeHRpY2tzID0gYXhlcy54LnRpY2tzKCk7XG4gICAgICAgIGdyLnNlbGVjdEFsbChcImxpbmUuZ3JpZHhcIikuZGF0YSh4dGlja3MpLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJncmlkIGdyaWR4XCIpXG4gICAgICAgICAgLmF0dHIoXCJ4MVwiLCBheGVzLnguc2NhbGUpLmF0dHIoXCJ4MlwiLCBheGVzLnguc2NhbGUpXG4gICAgICAgICAgLmF0dHIoXCJ5MVwiLCAwKS5hdHRyKFwieTJcIiwgaCk7XG4gICAgICAgIHZhciB5dGlja3MgPSBheGVzLnkudGlja3MoKTtcbiAgICAgICAgZ3Iuc2VsZWN0QWxsKFwibGluZS5ncmlkeVwiKS5kYXRhKHl0aWNrcykuZW50ZXIoKS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImdyaWQgZ3JpZHlcIilcbiAgICAgICAgICAuYXR0cihcIngxXCIsIDApLmF0dHIoXCJ4MlwiLCB3KVxuICAgICAgICAgIC5hdHRyKFwieTFcIiwgYXhlcy55LnNjYWxlKS5hdHRyKFwieTJcIiwgYXhlcy55LnNjYWxlKTtcbiAgICAgICAgLy8gYWRkIGNyb3NzaGFpcnMgdG8gZ3JhcGhcbiAgICAgICAgdmFyIGdjcm9zc2ggPSBnci5hcHBlbmQoXCJnXCIpLmNsYXNzZWQoXCJjcm9zc2hhaXJzXCIsIHRydWUpO1xuICAgICAgICBnY3Jvc3NoLmFwcGVuZChcImxpbmVcIikuY2xhc3NlZChcImhsaW5lXCIsIHRydWUpLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgIC5hdHRyKFwieTFcIiwgMCkuYXR0cihcIngyXCIsIGF4ZXMueC53aWR0aCgpKS5hdHRyKFwieTJcIiwgMClcbiAgICAgICAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICAgICAgICBnY3Jvc3NoLmFwcGVuZChcImxpbmVcIikuY2xhc3NlZChcInZsaW5lXCIsIHRydWUpLmF0dHIoXCJ4MVwiLCAwKVxuICAgICAgICAgIC5hdHRyKFwieTFcIiwgMCkuYXR0cihcIngyXCIsIDApLmF0dHIoXCJ5MlwiLCBheGVzLnkuaGVpZ2h0KCkpXG4gICAgICAgICAgLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICAgICAgLy8gZHJhdyBwYW5lbFxuICAgICAgICBncmFwaF9wYW5lbChnciwgZGpbal0udmFsdWVzKTtcbiAgICAgICAgLy8gbmV4dCBwYW5lbFxuICAgICAgICB0ICs9IGF4ZXMueS5oZWlnaHQoKSArIHNldHRpbmdzKCdzZXAnKTtcbiAgICAgIH1cbiAgICAgIGwgKz0gYXhlcy54LndpZHRoKCkgKyBzZXR0aW5ncygnc2VwJyk7XG4gICAgfVxuICAgIC8vIGZpbmlzaGVkIGRyYXdpbmcgY2FsbCByZWFkeSBldmVudFxuICAgIGRpc3BhdGNoLnJlYWR5LmNhbGwoZyk7XG4gIH0pO1xuXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxuZnVuY3Rpb24gZ3JwaF9ncmFwaChheGVzLCBkaXNwYXRjaCwgZ3JhcGgpIHtcblxuICB2YXIgd2lkdGgsIGhlaWdodDtcbiAgdmFyIGRhdGEsIHNjaGVtYTtcblxuICBncmFwaC5heGVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzLmtleXMoYXhlcyk7XG4gIH07XG5cbiAgZ3JhcGgud2lkdGggPSBmdW5jdGlvbih3KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB3aWR0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGggPSB3O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIGdyYXBoLmhlaWdodCA9IGZ1bmN0aW9uKGgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgaGVpZ2h0ID0gaDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBncmFwaC5hY2NlcHQgPSBmdW5jdGlvbih2YXJpYWJsZXMsIGF4aXMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIGlmIChheGVzW2F4aXNdID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiBheGVzW2F4aXNdLmFjY2VwdCh2YXJpYWJsZXMsIHNjaGVtYSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGkgaW4gYXhlcykge1xuICAgICAgICBpZiAodmFyaWFibGVzW2ldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAoYXhlc1tpXS5yZXF1aXJlZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBhY2NlcHQgPSBheGVzW2ldLmFjY2VwdCh2YXJpYWJsZXNbaV0sIHNjaGVtYSk7XG4gICAgICAgICAgaWYgKCFhY2NlcHQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuXG4gIGdyYXBoLmFzc2lnbiA9IGZ1bmN0aW9uKHZhcmlhYmxlcykge1xuICAgIGZvciAodmFyIGkgaW4gYXhlcykgYXhlc1tpXS52YXJpYWJsZSh2YXJpYWJsZXNbaV0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIGdyYXBoLnNjaGVtYSA9IGZ1bmN0aW9uKHMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NoZW1hID0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBncmFwaC5kYXRhID0gZnVuY3Rpb24oZCwgcykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGF0YSA9IGQ7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIFxuICAgICAgICBncmFwaC5zY2hlbWEocyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgZ3JhcGguZGlzcGF0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2g7XG4gIH07XG5cbiAgcmV0dXJuIGdyYXBoO1xufVxuXG4iLCJcbmZ1bmN0aW9uIGdycGhfZ3JhcGhfYmFyKCkge1xuXG4gIHZhciBheGVzID0ge1xuICAgICd4JyA6IGdycGhfYXhpc19saW5lYXIodHJ1ZSkub3JpZ2luKDApLFxuICAgICd5JyA6IGdycGhfYXhpc19jYXRlZ29yaWNhbCgpLFxuICAgICdjb2xvdXInOiBncnBoX2F4aXNfY29sb3VyKCksXG4gICAgJ2NvbHVtbicgOiBncnBoX2F4aXNfc3BsaXQoKSxcbiAgICAncm93JyA6IGdycGhfYXhpc19zcGxpdCgpXG4gIH07XG4gIGF4ZXMueC5yZXF1aXJlZCA9IHRydWU7XG4gIGF4ZXMueS5yZXF1aXJlZCA9IHRydWU7XG4gIHZhciBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKFwibW91c2VvdmVyXCIsIFwibW91c2VvdXRcIiwgXCJjbGlja1wiLCBcInJlYWR5XCIpO1xuXG4gIHZhciBncmFwaCA9IGdycGhfZ2VuZXJpY19ncmFwaChheGVzLCBkaXNwYXRjaCwgXCJiYXJcIiwgZnVuY3Rpb24oZywgZGF0YSkge1xuICAgIGZ1bmN0aW9uIG5lc3RfY29sb3VyKGQpIHtcbiAgICAgIHJldHVybiBheGVzLmNvbG91ci52YXJpYWJsZSgpID8gZFtheGVzLmNvbG91ci52YXJpYWJsZSgpXSA6IDE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldF94KGQpIHtcbiAgICAgIHZhciB2ID0gYXhlcy54LnNjYWxlKGQpO1xuICAgICAgcmV0dXJuIHYgPCBheGVzLnguc2NhbGUob3JpZ2luKSA/IHYgOiBheGVzLnguc2NhbGUob3JpZ2luKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0X3dpZHRoKGQpIHtcbiAgICAgIHJldHVybiBNYXRoLmFicyhheGVzLnguc2NhbGUoZCkgLSBheGVzLnguc2NhbGUob3JpZ2luKSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldF95KGQpIHtcbiAgICAgIHJldHVybiBheGVzLnkuc2NhbGUubChkKSArIGkqYXhlcy55LnNjYWxlLncoZCkvbmNvbG91cnM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldF9oZWlnaHQoZCkge1xuICAgICAgcmV0dXJuIGF4ZXMueS5zY2FsZS53KGQpL25jb2xvdXJzO1xuICAgIH1cblxuICAgIHZhciBkID0gZDMubmVzdCgpLmtleShuZXN0X2NvbG91cikuZW50cmllcyhkYXRhKTtcbiAgICB2YXIgbmNvbG91cnMgPSBkLmxlbmd0aDtcbiAgICB2YXIgb3JpZ2luID0gYXhlcy54Lm9yaWdpbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGNvbG91ciA9IGF4ZXMuY29sb3VyLnNjYWxlKGRbaV0ua2V5KTtcbiAgICAgIGcuc2VsZWN0QWxsKFwicmVjdC5cIiArIGNvbG91cikuZGF0YShkW2ldLnZhbHVlcykuZW50ZXIoKS5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJiYXIgXCIgKyBjb2xvdXIpLmF0dHIoXCJ4XCIsIGdldF94KVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIGdldF93aWR0aCkuYXR0cihcInlcIiwgZ2V0X3kpLmF0dHIoXCJoZWlnaHRcIiwgZ2V0X2hlaWdodCk7XG4gICAgfVxuICAgIGcuYXBwZW5kKFwibGluZVwiKS5hdHRyKFwiY2xhc3NcIiwgXCJvcmlnaW5cIilcbiAgICAgIC5hdHRyKFwieDFcIiwgYXhlcy54LnNjYWxlKG9yaWdpbikpXG4gICAgICAuYXR0cihcIngyXCIsIGF4ZXMueC5zY2FsZShvcmlnaW4pKVxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKS5hdHRyKFwieTJcIiwgYXhlcy55LmhlaWdodCgpKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiBmaW5pc2hlZCBkcmF3aW5nIGdyYXBoOyBhZGQgZXZlbnQgaGFuZGxlcnMgXG4gIGRpc3BhdGNoLm9uKFwicmVhZHlcIiwgZnVuY3Rpb24oKSB7XG4gICAgLy8gYWRkIGhvdmVyIGV2ZW50cyB0byB0aGUgbGluZXMgYW5kIHBvaW50c1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLm1vdXNlb3Zlci5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSkub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGVzLmNvbG91ci52YXJpYWJsZSgpO1xuICAgICAgdmFyIHZhbHVlID0gdmFyaWFibGUgPyAoZC5rZXkgfHwgZFt2YXJpYWJsZV0pIDogdW5kZWZpbmVkO1xuICAgICAgZGlzcGF0Y2gubW91c2VvdXQuY2FsbChzZWxmLCB2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLmNsaWNrLmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gTG9jYWwgZXZlbnQgaGFuZGxlcnNcbiAgZGlzcGF0Y2gub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgaWYgKHZhcmlhYmxlKSB7XG4gICAgICB2YXIgY2xhc3NlcyA9IGF4ZXMuY29sb3VyLnNjYWxlKFwiXCIgKyB2YWx1ZSk7XG4gICAgICB2YXIgcmVnZXhwID0gL1xcYmNvbG91cihbMC05XSspXFxiLztcbiAgICAgIHZhciBjb2xvdXIgPSByZWdleHAuZXhlYyhjbGFzc2VzKVswXTtcbiAgICAgIHRoaXMuc2VsZWN0QWxsKFwiLmNvbG91clwiKS5jbGFzc2VkKFwiY29sb3VybG93XCIsIHRydWUpO1xuICAgICAgdGhpcy5zZWxlY3RBbGwoXCIuXCIgKyBjb2xvdXIpLmNsYXNzZWQoe1wiY29sb3VyaGlnaFwiOiB0cnVlLCBcImNvbG91cmxvd1wiOiBmYWxzZX0pO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdEFsbChcIi5obGluZVwiKS5hdHRyKFwieTFcIiwgYXhlcy55LnNjYWxlKGQpKS5hdHRyKFwieTJcIiwgYXhlcy55LnNjYWxlKGQpKVxuICAgICAgLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcInZpc2libGVcIik7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIudmxpbmVcIikuYXR0cihcIngxXCIsIGF4ZXMueC5zY2FsZShkKSkuYXR0cihcIngyXCIsIGF4ZXMueC5zY2FsZShkKSlcbiAgICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICB9KTtcbiAgZGlzcGF0Y2gub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikuY2xhc3NlZCh7XCJjb2xvdXJoaWdoXCI6IGZhbHNlLCBcImNvbG91cmxvd1wiOiBmYWxzZX0pO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmhsaW5lXCIpLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi52bGluZVwiKS5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gIH0pO1xuXG4gIC8vIFRvb2x0aXBcbiAgLy8gd2hlbiBkMy50aXAgaXMgbG9hZGVkXG4gIGlmIChkMy50aXAgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciB0aXAgPSBkMy50aXAoKS5kaXJlY3Rpb24oXCJzZVwiKS5hdHRyKCdjbGFzcycsICd0aXAgdGlwLWJhcicpLmh0bWwoZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7IFxuICAgICAgdmFyIHNjaGVtYSA9IGdyYXBoLnNjaGVtYSgpO1xuICAgICAgdmFyIGZvcm1hdCA9IHZhbHVlX2Zvcm1hdHRlcihzY2hlbWEpO1xuICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgZm9yICh2YXIgaSBpbiBzY2hlbWEuZmllbGRzKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgICAgIHN0ciArPSBmaWVsZC50aXRsZSArICc6ICcgKyBmb3JtYXQoZCwgZmllbGQubmFtZSkgKyAnPC9icj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcInJlYWR5LnRpcFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2FsbCh0aXApO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwibW91c2VvdmVyLnRpcFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICAgIHRpcC5zaG93KHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJtb3VzZW91dC50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuaGlkZSh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGdyYXBoO1xufVxuIiwiXG5mdW5jdGlvbiBncnBoX2dyYXBoX2J1YmJsZSgpIHtcblxuICB2YXIgYXhlcyA9IHtcbiAgICAneCcgOiBncnBoX2F4aXNfbGluZWFyKHRydWUpLFxuICAgICd5JyA6IGdycGhfYXhpc19saW5lYXIoZmFsc2UpLFxuICAgICdvYmplY3QnIDogZ3JwaF9heGlzX2NvbG91cigpLFxuICAgICdzaXplJyAgIDogZ3JwaF9heGlzX3NpemUoKSxcbiAgICAnY29sb3VyJyA6IGdycGhfYXhpc19jb2xvdXIoKSxcbiAgICAnY29sdW1uJyA6IGdycGhfYXhpc19zcGxpdCgpLFxuICAgICdyb3cnIDogZ3JwaF9heGlzX3NwbGl0KClcbiAgfTtcbiAgYXhlcy54LnJlcXVpcmVkID0gdHJ1ZTtcbiAgYXhlcy55LnJlcXVpcmVkID0gdHJ1ZTtcbiAgYXhlcy5vYmplY3QucmVxdWlyZWQgPSB0cnVlO1xuICB2YXIgZGlzcGF0Y2ggPSBkMy5kaXNwYXRjaChcIm1vdXNlb3ZlclwiLCBcIm1vdXNlb3V0XCIsIFwiY2xpY2tcIiwgXCJyZWFkeVwiKTtcblxuICB2YXIgZ3JhcGggPSBncnBoX2dlbmVyaWNfZ3JhcGgoYXhlcywgZGlzcGF0Y2gsIFwiYnViYmxlXCIsIGZ1bmN0aW9uKGcsIGRhdGEpIHtcbiAgICBmdW5jdGlvbiBuZXN0X29iamVjdChkKSB7XG4gICAgICByZXR1cm4gYXhlcy5vYmplY3QudmFyaWFibGUoKSA/IGRbYXhlcy5vYmplY3QudmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICBmdW5jdGlvbiBuZXN0X2NvbG91cihkKSB7XG4gICAgICByZXR1cm4gYXhlcy5jb2xvdXIudmFyaWFibGUoKSA/IGRbYXhlcy5jb2xvdXIudmFyaWFibGUoKV0gOiAxO1xuICAgIH1cbiAgICB2YXIgZCA9IGQzLm5lc3QoKS5rZXkobmVzdF9jb2xvdXIpLmVudHJpZXMoZGF0YSk7XG4gICAgLy8gZHJhdyBidWJibGVzIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZC5sZW5ndGg7ICsraSkge1xuICAgICAgZy5zZWxlY3RBbGwoXCJjaXJjbGUuYnViYmxlXCIgKyBpKS5kYXRhKGRbaV0udmFsdWVzKS5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiYnViYmxlIGJ1YmJsZVwiICsgaSArIFwiIFwiICsgYXhlcy5jb2xvdXIuc2NhbGUoZFtpXS5rZXkpKVxuICAgICAgICAuYXR0cihcImN4XCIsIGF4ZXMueC5zY2FsZSkuYXR0cihcImN5XCIsIGF4ZXMueS5zY2FsZSlcbiAgICAgICAgLmF0dHIoXCJyXCIsIGF4ZXMuc2l6ZS5zY2FsZSk7XG4gICAgfVxuICAgIC8vIGRyYXcgbGluZXNcbiAgICBnLnNlbGVjdEFsbChcImcubGluZVwiKS5kYXRhKGxpbmVzKS5lbnRlcigpLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwibGluZVwiKVxuICAgICAgLmVhY2goZnVuY3Rpb24oZCkgeyBkLmRyYXcodGhpcywgZCwgYXhlcyk7fSk7XG4gIH0pO1xuXG5cbiAgLy8gd2hlbiBmaW5pc2hlZCBkcmF3aW5nIGdyYXBoOyBhZGQgZXZlbnQgaGFuZGxlcnMgXG4gIGRpc3BhdGNoLm9uKFwicmVhZHlcIiwgZnVuY3Rpb24oKSB7XG4gICAgLy8gYWRkIGhvdmVyIGV2ZW50cyB0byB0aGUgbGluZXMgYW5kIHBvaW50c1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLm1vdXNlb3Zlci5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSkub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGVzLmNvbG91ci52YXJpYWJsZSgpO1xuICAgICAgdmFyIHZhbHVlID0gdmFyaWFibGUgPyAoZC5rZXkgfHwgZFt2YXJpYWJsZV0pIDogdW5kZWZpbmVkO1xuICAgICAgZGlzcGF0Y2gubW91c2VvdXQuY2FsbChzZWxmLCB2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLmNsaWNrLmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gTG9jYWwgZXZlbnQgaGFuZGxlcnNcbiAgZGlzcGF0Y2gub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgaWYgKHZhcmlhYmxlKSB7XG4gICAgICB2YXIgY2xhc3NlcyA9IGF4ZXMuY29sb3VyLnNjYWxlKFwiXCIgKyB2YWx1ZSk7XG4gICAgICB2YXIgcmVnZXhwID0gL1xcYmNvbG91cihbMC05XSspXFxiLztcbiAgICAgIHZhciBjb2xvdXIgPSByZWdleHAuZXhlYyhjbGFzc2VzKVswXTtcbiAgICAgIHRoaXMuc2VsZWN0QWxsKFwiLmNvbG91clwiKS5jbGFzc2VkKFwiY29sb3VybG93XCIsIHRydWUpO1xuICAgICAgdGhpcy5zZWxlY3RBbGwoXCIuXCIgKyBjb2xvdXIpLmNsYXNzZWQoe1wiY29sb3VyaGlnaFwiOiB0cnVlLCBcImNvbG91cmxvd1wiOiBmYWxzZX0pO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdEFsbChcIi5obGluZVwiKS5hdHRyKFwieTFcIiwgYXhlcy55LnNjYWxlKGQpKS5hdHRyKFwieTJcIiwgYXhlcy55LnNjYWxlKGQpKVxuICAgICAgLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcInZpc2libGVcIik7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIudmxpbmVcIikuYXR0cihcIngxXCIsIGF4ZXMueC5zY2FsZShkKSkuYXR0cihcIngyXCIsIGF4ZXMueC5zY2FsZShkKSlcbiAgICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICB9KTtcbiAgZGlzcGF0Y2gub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikuY2xhc3NlZCh7XCJjb2xvdXJoaWdoXCI6IGZhbHNlLCBcImNvbG91cmxvd1wiOiBmYWxzZX0pO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmhsaW5lXCIpLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICB0aGlzLnNlbGVjdEFsbChcIi52bGluZVwiKS5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gIH0pO1xuXG4gIC8vIFRvb2x0aXBcbiAgLy8gd2hlbiBkMy50aXAgaXMgbG9hZGVkXG4gIGlmIChkMy50aXAgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciB0aXAgPSBkMy50aXAoKS5kaXJlY3Rpb24oXCJzZVwiKS5hdHRyKCdjbGFzcycsICd0aXAgdGlwLWJ1YmJsZScpLmh0bWwoZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7IFxuICAgICAgdmFyIHNjaGVtYSA9IGdyYXBoLnNjaGVtYSgpO1xuICAgICAgdmFyIGZvcm1hdCA9IHZhbHVlX2Zvcm1hdHRlcihzY2hlbWEpO1xuICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgZm9yICh2YXIgaSBpbiBzY2hlbWEuZmllbGRzKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgICAgIHN0ciArPSBmaWVsZC50aXRsZSArICc6ICcgKyBmb3JtYXQoZCwgZmllbGQubmFtZSkgKyAnPC9icj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcInJlYWR5LnRpcFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2FsbCh0aXApO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwibW91c2VvdmVyLnRpcFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICAgIHRpcC5zaG93KHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJtb3VzZW91dC50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuaGlkZSh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICB9XG5cbiAgXG4gIHZhciBsaW5lcyA9IFtdO1xuICBncmFwaC5hZGRfaGxpbmUgPSBmdW5jdGlvbihoLCBjbGFzc25hbWUpIHtcbiAgICBmdW5jdGlvbiBkcmF3X2hsaW5lKGcsIGRhdGEsIGF4ZXMpIHtcbiAgICAgIHZhciB4bWluID0gYXhlcy54LnNjYWxlKGF4ZXMueC5kb21haW4oKVswXSk7XG4gICAgICB2YXIgeG1heCA9IGF4ZXMueC5zY2FsZShheGVzLnguZG9tYWluKClbMV0pO1xuICAgICAgZDMuc2VsZWN0KGcpLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgLmF0dHIoXCJ4MVwiLCB4bWluKS5hdHRyKFwieDJcIiwgeG1heClcbiAgICAgICAgLmF0dHIoXCJ5MVwiLCBheGVzLnkuc2NhbGUoZGF0YS5oKSlcbiAgICAgICAgLmF0dHIoXCJ5MlwiLCBheGVzLnkuc2NhbGUoZGF0YS5oKSlcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBkYXRhWydjbGFzcyddKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCh7ZHJhdyA6IGRyYXdfaGxpbmUsIGggOiBoLCAnY2xhc3MnIDogY2xhc3NuYW1lfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIGdyYXBoLmFkZF9hYmxpbmUgPSBmdW5jdGlvbihhLCBiLCBjbGFzc25hbWUpIHtcbiAgICBmdW5jdGlvbiBkcmF3X2hsaW5lKGcsIGRhdGEsIGF4ZXMpIHtcbiAgICAgIHZhciBkb21haW4gPSBheGVzLnguZG9tYWluKCk7XG4gICAgICBkMy5zZWxlY3QoZykuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAuYXR0cihcIngxXCIsIGF4ZXMueC5zY2FsZShkb21haW5bMF0pKVxuICAgICAgICAuYXR0cihcIngyXCIsIGF4ZXMueC5zY2FsZShkb21haW5bMV0pKVxuICAgICAgICAuYXR0cihcInkxXCIsIGF4ZXMueS5zY2FsZShhICsgYiAqIGRvbWFpblswXSkpXG4gICAgICAgIC5hdHRyKFwieTJcIiwgYXhlcy55LnNjYWxlKGEgKyBiICogZG9tYWluWzFdKSlcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBkYXRhWydjbGFzcyddKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCh7ZHJhdyA6IGRyYXdfaGxpbmUsIGEgOiBhLCBiOiBiLCAnY2xhc3MnIDogY2xhc3NuYW1lfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cblxuICByZXR1cm4gZ3JhcGg7XG59XG5cbiIsIlxuZnVuY3Rpb24gZ3JwaF9ncmFwaF9saW5lKCkge1xuXG4gIHZhciBheGVzID0ge1xuICAgICd4JyA6IGdycGhfYXhpc19zd2l0Y2goW2dycGhfYXhpc19saW5lYXIodHJ1ZSksIGdycGhfYXhpc19wZXJpb2QoKV0pLFxuICAgICd5JyA6IGdycGhfYXhpc19saW5lYXIoZmFsc2UpLFxuICAgICdjb2xvdXInIDogZ3JwaF9heGlzX2NvbG91cigpLFxuICAgICdjb2x1bW4nIDogZ3JwaF9heGlzX3NwbGl0KCksXG4gICAgJ3JvdycgOiBncnBoX2F4aXNfc3BsaXQoKVxuICB9O1xuICBheGVzLngucmVxdWlyZWQgPSB0cnVlO1xuICBheGVzLnkucmVxdWlyZWQgPSB0cnVlO1xuICB2YXIgZGlzcGF0Y2ggPSBkMy5kaXNwYXRjaChcIm1vdXNlb3ZlclwiLCBcIm1vdXNlb3V0XCIsIFwicG9pbnRvdmVyXCIsIFwicG9pbnRvdXRcIixcbiAgICBcImNsaWNrXCIsIFwicmVhZHlcIik7XG5cbiAgdmFyIGdyYXBoID0gZ3JwaF9nZW5lcmljX2dyYXBoKGF4ZXMsIGRpc3BhdGNoLCBcImxpbmVcIiwgZnVuY3Rpb24oZywgZGF0YSkge1xuICAgIGZ1bmN0aW9uIG5lc3RfY29sb3VyKGQpIHtcbiAgICAgIHJldHVybiBheGVzLmNvbG91ci52YXJpYWJsZSgpID8gZFtheGVzLmNvbG91ci52YXJpYWJsZSgpXSA6IDE7XG4gICAgfVxuICAgIHZhciBkID0gZDMubmVzdCgpLmtleShuZXN0X2NvbG91cikuZW50cmllcyhkYXRhKTtcbiAgICAvLyBkcmF3IGxpbmVzIFxuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKS54KGF4ZXMueC5zY2FsZSkueShheGVzLnkuc2NhbGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZC5sZW5ndGg7ICsraSkge1xuICAgICAgZy5hcHBlbmQoXCJwYXRoXCIpLmF0dHIoXCJkXCIsIGxpbmUoZFtpXS52YWx1ZXMpKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGF4ZXMuY29sb3VyLnNjYWxlKGRbaV0ua2V5KSlcbiAgICAgICAgLmRhdHVtKGRbaV0pO1xuICAgIH1cbiAgICAvLyBkcmF3IHBvaW50cyBcbiAgICBmb3IgKGkgPSAwOyBpIDwgZC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGNscyA9IFwiY2lyY2xlXCIgKyBpO1xuICAgICAgZy5zZWxlY3RBbGwoXCJjaXJjbGUuY2lyY2xlXCIgKyBpKS5kYXRhKGRbaV0udmFsdWVzKS5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiY2lyY2xlXCIgKyBpICsgXCIgXCIgKyBheGVzLmNvbG91ci5zY2FsZShkW2ldLmtleSkpXG4gICAgICAgIC5hdHRyKFwiY3hcIiwgYXhlcy54LnNjYWxlKS5hdHRyKFwiY3lcIiwgYXhlcy55LnNjYWxlKVxuICAgICAgICAuYXR0cihcInJcIiwgc2V0dGluZ3MoJ3BvaW50X3NpemUnKSk7XG4gICAgfVxuICB9KTtcblxuICAvLyB3aGVuIGZpbmlzaGVkIGRyYXdpbmcgZ3JhcGg7IGFkZCBldmVudCBoYW5kbGVycyBcbiAgZGlzcGF0Y2gub24oXCJyZWFkeVwiLCBmdW5jdGlvbigpIHtcbiAgICAvLyBhZGQgaG92ZXIgZXZlbnRzIHRvIHRoZSBsaW5lcyBhbmQgcG9pbnRzXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmNvbG91clwiKS5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGVzLmNvbG91ci52YXJpYWJsZSgpO1xuICAgICAgdmFyIHZhbHVlID0gdmFyaWFibGUgPyAoZC5rZXkgfHwgZFt2YXJpYWJsZV0pIDogdW5kZWZpbmVkO1xuICAgICAgZGlzcGF0Y2gubW91c2VvdmVyLmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICAgIGlmICghZC5rZXkpIGRpc3BhdGNoLnBvaW50b3Zlci5jYWxsKHNlbGYsIHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSkub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgdmFyaWFibGUgPSBheGVzLmNvbG91ci52YXJpYWJsZSgpO1xuICAgICAgdmFyIHZhbHVlID0gdmFyaWFibGUgPyAoZC5rZXkgfHwgZFt2YXJpYWJsZV0pIDogdW5kZWZpbmVkO1xuICAgICAgZGlzcGF0Y2gubW91c2VvdXQuY2FsbChzZWxmLCB2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgICAgaWYgKCFkLmtleSkgZGlzcGF0Y2gucG9pbnRvdXQuY2FsbChzZWxmLCB2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgdmFyIHZhcmlhYmxlID0gYXhlcy5jb2xvdXIudmFyaWFibGUoKTtcbiAgICAgIHZhciB2YWx1ZSA9IHZhcmlhYmxlID8gKGQua2V5IHx8IGRbdmFyaWFibGVdKSA6IHVuZGVmaW5lZDtcbiAgICAgIGRpc3BhdGNoLmNsaWNrLmNhbGwoc2VsZiwgdmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgfSk7XG4gIC8vIExvY2FsIGV2ZW50IGhhbmRsZXJzXG4gIC8vIEhpZ2hsaWdodGluZyBvZiBzZWxlY3RlZCBsaW5lXG4gIGRpc3BhdGNoLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgIGlmICh2YXJpYWJsZSkge1xuICAgICAgdmFyIGNsYXNzZXMgPSBheGVzLmNvbG91ci5zY2FsZShcIlwiICsgdmFsdWUpO1xuICAgICAgdmFyIHJlZ2V4cCA9IC9cXGJjb2xvdXIoWzAtOV0rKVxcYi87XG4gICAgICB2YXIgY29sb3VyID0gcmVnZXhwLmV4ZWMoY2xhc3NlcylbMF07XG4gICAgICB0aGlzLnNlbGVjdEFsbChcIi5jb2xvdXJcIikuY2xhc3NlZChcImNvbG91cmxvd1wiLCB0cnVlKTtcbiAgICAgIHRoaXMuc2VsZWN0QWxsKFwiLlwiICsgY29sb3VyKS5jbGFzc2VkKHtcImNvbG91cmhpZ2hcIjogdHJ1ZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgICB9XG4gIH0pO1xuICBkaXNwYXRjaC5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLmNvbG91clwiKS5jbGFzc2VkKHtcImNvbG91cmhpZ2hcIjogZmFsc2UsIFwiY29sb3VybG93XCI6IGZhbHNlfSk7XG4gIH0pO1xuICAvLyBTaG93IGNyb3NzaGFpcnMgd2hlbiBob3ZlcmluZyBvdmVyIGEgcG9pbnRcbiAgZGlzcGF0Y2gub24oXCJwb2ludG92ZXJcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuaGxpbmVcIikuYXR0cihcInkxXCIsIGF4ZXMueS5zY2FsZShkKSkuYXR0cihcInkyXCIsIGF4ZXMueS5zY2FsZShkKSlcbiAgICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLnZsaW5lXCIpLmF0dHIoXCJ4MVwiLCBheGVzLnguc2NhbGUoZCkpLmF0dHIoXCJ4MlwiLCBheGVzLnguc2NhbGUoZCkpXG4gICAgICAuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgfSk7XG4gIGRpc3BhdGNoLm9uKFwicG9pbnRvdXRcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCIuaGxpbmVcIikuc3R5bGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICAgIHRoaXMuc2VsZWN0QWxsKFwiLnZsaW5lXCIpLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgfSk7XG5cbiAgLy8gVG9vbHRpcFxuICAvLyB3aGVuIGQzLnRpcCBpcyBsb2FkZWRcbiAgaWYgKGQzLnRpcCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHRpcCA9IGQzLnRpcCgpLmRpcmVjdGlvbihcInNlXCIpLmF0dHIoJ2NsYXNzJywgJ3RpcCB0aXAtbGluZScpLmh0bWwoZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7IFxuICAgICAgdmFyIHNjaGVtYSA9IGdyYXBoLnNjaGVtYSgpO1xuICAgICAgdmFyIGZvcm1hdCA9IHZhbHVlX2Zvcm1hdHRlcihzY2hlbWEpO1xuICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgZm9yICh2YXIgaSBpbiBzY2hlbWEuZmllbGRzKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgICAgIHN0ciArPSBmaWVsZC50aXRsZSArICc6ICcgKyBmb3JtYXQoZCxmaWVsZC5uYW1lKSArICc8L2JyPic7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwicmVhZHkudGlwXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jYWxsKHRpcCk7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJwb2ludG92ZXIudGlwXCIsIGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSwgZCkge1xuICAgICAgdGlwLnNob3codmFyaWFibGUsIHZhbHVlLCBkKTtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcInBvaW50b3V0LnRpcFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICAgIHRpcC5oaWRlKHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZ3JhcGg7XG59XG5cbiIsIlxuXG5mdW5jdGlvbiBncnBoX2dyYXBoX21hcCgpIHtcblxuICB2YXIgYXhlcyA9IHtcbiAgICAncmVnaW9uJyA6IGdycGhfYXhpc19yZWdpb24oKSxcbiAgICAnY29sb3VyJyA6IGdycGhfYXhpc19jaGxvcm9wbGV0aCgpLFxuICAgICdjb2x1bW4nIDogZ3JwaF9heGlzX3NwbGl0KCksXG4gICAgJ3JvdycgOiBncnBoX2F4aXNfc3BsaXQoKVxuICB9O1xuICBheGVzLnJlZ2lvbi5yZXF1aXJlZCA9IHRydWU7XG4gIGF4ZXMuY29sb3VyLnJlcXVpcmVkID0gdHJ1ZTtcbiAgdmFyIGRpc3BhdGNoID0gZDMuZGlzcGF0Y2goXCJyZWFkeVwiLCBcIm1vdXNlb3ZlclwiLCBcIm1vdXNlb3V0XCIsIFwiY2xpY2tcIik7XG5cbiAgdmFyIGR1bW15XyA9IGQzLnNlbGVjdChcImJvZHlcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLCBcImR1bW15IGdyYXBoIGdyYXBoLW1hcFwiKVxuICAgIC5hdHRyKFwid2lkdGhcIiwgMCkuYXR0cihcImhlaWdodFwiLCAwKVxuICAgIC5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gIHZhciBsYWJlbF9zaXplXyA9IGdycGhfbGFiZWxfc2l6ZShkdW1teV8pO1xuXG5cbiAgdmFyIGdyYXBoID0gZ3JwaF9ncmFwaChheGVzLCBkaXNwYXRjaCwgZnVuY3Rpb24oZykge1xuICAgIGZ1bmN0aW9uIG5lc3RfY29sdW1uKGQpIHtcbiAgICAgIHJldHVybiBheGVzLmNvbHVtbi52YXJpYWJsZSgpID8gZFtheGVzLmNvbHVtbi52YXJpYWJsZSgpXSA6IDE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG5lc3Rfcm93KGQpIHtcbiAgICAgIHJldHVybiBheGVzLnJvdy52YXJpYWJsZSgpID8gZFtheGVzLnJvdy52YXJpYWJsZSgpXSA6IDE7XG4gICAgfVxuICAgIC8vIHNldHVwIGF4ZXNcbiAgICBheGVzLnJlZ2lvbi5kb21haW4oZ3JhcGguZGF0YSgpLCBncmFwaC5zY2hlbWEoKSk7XG4gICAgYXhlcy5jb2xvdXIuZG9tYWluKGdyYXBoLmRhdGEoKSwgZ3JhcGguc2NoZW1hKCkpO1xuICAgIGF4ZXMuY29sdW1uLmRvbWFpbihncmFwaC5kYXRhKCksIGdyYXBoLnNjaGVtYSgpKTtcbiAgICBheGVzLnJvdy5kb21haW4oZ3JhcGguZGF0YSgpLCBncmFwaC5zY2hlbWEoKSk7XG5cbiAgICAvLyBkZXRlcm1pbmUgbnVtYmVyIG9mIHJvd3MgYW5kIGNvbHVtbnNcbiAgICB2YXIgbmNvbCA9IGF4ZXMuY29sdW1uLnZhcmlhYmxlKCkgPyBheGVzLmNvbHVtbi50aWNrcygpLmxlbmd0aCA6IDE7XG4gICAgdmFyIG5yb3cgPSBheGVzLnJvdy52YXJpYWJsZSgpID8gYXhlcy5yb3cudGlja3MoKS5sZW5ndGggOiAxO1xuICAgIC8vIHNldCB0aGUgd2lkdGgsIGhlaWdodCBlbmQgZG9tYWluIG9mIHRoZSB4LSBhbmQgeS1heGVzXG4gICAgdmFyIGxhYmVsX2hlaWdodCA9IGxhYmVsX3NpemVfLmhlaWdodChcInZhcmlhYmxlXCIpICsgc2V0dGluZ3MoJ2xhYmVsX3BhZGRpbmcnKTtcbiAgICB2YXIgcm93bGFiZWxfd2lkdGggPSBheGVzLnJvdy52YXJpYWJsZSgpID8gMypsYWJlbF9oZWlnaHQgOiAwO1xuICAgIHZhciBjb2x1bW5sYWJlbF9oZWlnaHQgPSBheGVzLmNvbHVtbi52YXJpYWJsZSgpID8gMypsYWJlbF9oZWlnaHQgOiAwO1xuICAgIHZhciB3ID0gKGdyYXBoLndpZHRoKCkgLSBzZXR0aW5ncyhcInBhZGRpbmdcIiwgXCJtYXBcIilbMV0gLSBzZXR0aW5ncyhcInBhZGRpbmdcIiwgXCJtYXBcIilbM10gLSBcbiAgICAgIHJvd2xhYmVsX3dpZHRoIC0gKG5jb2wtMSkqc2V0dGluZ3MoXCJzZXBcIiwgXCJtYXBcIikpL25jb2w7XG4gICAgdmFyIGggPSAoZ3JhcGguaGVpZ2h0KCkgLSBzZXR0aW5ncyhcInBhZGRpbmdcIiwgXCJtYXBcIilbMF0gLSBzZXR0aW5ncyhcInBhZGRpbmdcIiwgXCJtYXBcIilbMl0gLSBcbiAgICAgIGNvbHVtbmxhYmVsX2hlaWdodCAtIChucm93LTEpKnNldHRpbmdzKFwic2VwXCIsIFwibWFwXCIpKS9ucm93O1xuICAgIHZhciBsID0gc2V0dGluZ3MoXCJwYWRkaW5nXCIsIFwibWFwXCIpWzFdO1xuICAgIHZhciB0ICA9IHNldHRpbmdzKFwicGFkZGluZ1wiLCBcIm1hcFwiKVsyXTtcbiAgICBheGVzLnJlZ2lvbi53aWR0aCh3KS5oZWlnaHQoaCk7XG4gICAgLy8gY3JlYXRlIGdyb3VwIGNvbnRhaW5pbmcgY29tcGxldGUgZ3JhcGhcbiAgICBnID0gZy5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcImdyYXBoIGdyYXBoLW1hcFwiKTtcbiAgICAvLyBkcmF3IGxhYmVsc1xuICAgIHZhciB5Y2VudGVyID0gdCArIDAuNSooZ3JhcGguaGVpZ2h0KCkgLSBzZXR0aW5ncygncGFkZGluZycpWzBdIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVsyXSAtIFxuICAgICAgICBsYWJlbF9oZWlnaHQgLSBjb2x1bW5sYWJlbF9oZWlnaHQpICsgY29sdW1ubGFiZWxfaGVpZ2h0O1xuICAgIHZhciB4Y2VudGVyID0gbCArIDAuNSooZ3JhcGgud2lkdGgoKSAtIHNldHRpbmdzKCdwYWRkaW5nJylbMV0gLSBzZXR0aW5ncygncGFkZGluZycpWzNdIC0gXG4gICAgICAgIGxhYmVsX2hlaWdodCAtIHJvd2xhYmVsX3dpZHRoKTtcbiAgICBpZiAoYXhlcy5yb3cudmFyaWFibGUoKSkge1xuICAgICAgdmFyIHhyb3cgPSBncmFwaC53aWR0aCgpIC0gc2V0dGluZ3MoJ3BhZGRpbmcnKVszXSAtIGxhYmVsX2hlaWdodDtcbiAgICAgIHZhciB2c2NoZW1hcm93ID0gdmFyaWFibGVfc2NoZW1hKGF4ZXMucm93LnZhcmlhYmxlKCksIHNjaGVtYSk7XG4gICAgICB2YXIgcm93bGFiZWwgPSB2c2NoZW1hcm93LnRpdGxlO1xuICAgICAgZy5hcHBlbmQoXCJ0ZXh0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsIGxhYmVsLXlcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIHhyb3cpLmF0dHIoXCJ5XCIsIHljZW50ZXIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikudGV4dChyb3dsYWJlbClcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoOTAgXCIgKyB4cm93ICsgXCIgXCIgKyB5Y2VudGVyICsgXCIpXCIpO1xuICAgIH1cbiAgICBpZiAoYXhlcy5jb2x1bW4udmFyaWFibGUoKSkge1xuICAgICAgdmFyIHZzY2hlbWFjb2x1bW4gPSB2YXJpYWJsZV9zY2hlbWEoYXhlcy5jb2x1bW4udmFyaWFibGUoKSwgc2NoZW1hKTtcbiAgICAgIHZhciBjb2x1bW5sYWJlbCA9IHZzY2hlbWFjb2x1bW4udGl0bGU7XG4gICAgICBnLmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwibGFiZWwgbGFiZWwteVwiKVxuICAgICAgICAuYXR0cihcInhcIiwgeGNlbnRlcikuYXR0cihcInlcIiwgc2V0dGluZ3MoXCJwYWRkaW5nXCIpWzJdKS5hdHRyKFwiZHlcIiwgXCIwLjcxZW1cIilcbiAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKS50ZXh0KGNvbHVtbmxhYmVsKTtcbiAgICB9XG4gICAgLy8gZHJhdyBncmFwaHNcbiAgICB3YWl0X2ZvcihheGVzLnJlZ2lvbi5tYXBfbG9hZGVkLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkID0gZDMubmVzdCgpLmtleShuZXN0X2NvbHVtbikua2V5KG5lc3Rfcm93KS5lbnRyaWVzKGdyYXBoLmRhdGEoKSk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGQubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGRqID0gZFtpXS52YWx1ZXM7XG4gICAgICAgIHZhciB0ICA9IHNldHRpbmdzKFwicGFkZGluZ1wiLCBcIm1hcFwiKVsyXSArIGNvbHVtbmxhYmVsX2hlaWdodDtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBkai5sZW5ndGg7ICsraikge1xuICAgICAgICAgIC8vIGRyYXcgcm93IGxhYmVsc1xuICAgICAgICAgIGlmIChpID09IChkLmxlbmd0aC0xKSAmJiBheGVzLnJvdy52YXJpYWJsZSgpKSB7XG4gICAgICAgICAgICB2YXIgcm93dGljayA9IGF4ZXMucm93LnRpY2tzKClbal07XG4gICAgICAgICAgICB2YXIgZ3JvdyA9IGcuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJheGlzIGF4aXMtcm93XCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKGwgKyB3KSArIFwiLFwiICsgdCArIFwiKVwiKTtcbiAgICAgICAgICAgIGdyb3cuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgbGFiZWxfaGVpZ2h0ICsgMipzZXR0aW5ncyhcInRpY2tfcGFkZGluZ1wiKSlcbiAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaCk7XG4gICAgICAgICAgICBncm93LmFwcGVuZChcInRleHRcIikuYXR0cihcImNsYXNzXCIsIFwidGlja2xhYmVsXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwieFwiLCAwKS5hdHRyKFwieVwiLCBoLzIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDkwIFwiICsgXG4gICAgICAgICAgICAgICAgKGxhYmVsX2hlaWdodCAtIHNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKSArIFwiIFwiICsgaC8yICsgXCIpXCIpXG4gICAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikuYXR0cihcImR5XCIsIFwiMC4zNWVtXCIpXG4gICAgICAgICAgICAgIC50ZXh0KHJvd3RpY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBkcmF3IGNvbHVtbiBsYWJlbHNcbiAgICAgICAgICBpZiAoaiA9PT0gMCAmJiBheGVzLmNvbHVtbi52YXJpYWJsZSgpKSB7XG4gICAgICAgICAgICB2YXIgY29sdW1udGljayA9IGF4ZXMuY29sdW1uLnRpY2tzKClbaV07XG4gICAgICAgICAgICB2YXIgY29sdGlja2ggPSBsYWJlbF9oZWlnaHQgKyAyKnNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpO1xuICAgICAgICAgICAgdmFyIGdjb2x1bW4gPSBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwiYXhpcyBheGlzLWNvbHVtblwiKVxuICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGwgKyBcIixcIiArICh0IC0gY29sdGlja2gpICsgXCIpXCIpO1xuICAgICAgICAgICAgZ2NvbHVtbi5hcHBlbmQoXCJyZWN0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcbiAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3KVxuICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBsYWJlbF9oZWlnaHQgKyAyKnNldHRpbmdzKFwidGlja19wYWRkaW5nXCIpKTtcbiAgICAgICAgICAgIGdjb2x1bW4uYXBwZW5kKFwidGV4dFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJ0aWNrbGFiZWxcIilcbiAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHcvMikuYXR0cihcInlcIiwgc2V0dGluZ3MoXCJ0aWNrX3BhZGRpbmdcIikpXG4gICAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIikuYXR0cihcImR5XCIsIFwiMC43MWVtXCIpXG4gICAgICAgICAgICAgIC50ZXh0KGNvbHVtbnRpY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBkcmF3IGJveCBmb3IgZ3JhcGhcbiAgICAgICAgICB2YXIgZ3IgPSBnLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwibWFwXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGwgKyBcIixcIiArIHQgKyBcIilcIik7XG4gICAgICAgICAgZ3IuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHcpLmF0dHIoXCJoZWlnaHRcIiwgaCk7XG4gICAgICAgICAgLy8gZHJhdyBtYXBcbiAgICAgICAgICBnci5zZWxlY3RBbGwoXCJwYXRoXCIpLmRhdGEoZGpbal0udmFsdWVzKS5lbnRlcigpLmFwcGVuZChcInBhdGhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBheGVzLnJlZ2lvbi5zY2FsZSkuYXR0cihcImNsYXNzXCIsIGF4ZXMuY29sb3VyLnNjYWxlKTtcbiAgICAgICAgICAvLyBuZXh0IGxpbmVcbiAgICAgICAgICB0ICs9IGggKyBzZXR0aW5ncyhcInNlcFwiLCBcIm1hcFwiKTtcbiAgICAgICAgfVxuICAgICAgICBsICs9IHcgKyBzZXR0aW5ncyhcInNlcFwiLCBcIm1hcFwiKTtcbiAgICAgIH1cbiAgICAgIC8vIGFkZCBldmVudHMgdG8gdGhlIGxpbmVzXG4gICAgICBnLnNlbGVjdEFsbChcInBhdGhcIikub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICB2YXIgcmVnaW9uID0gZFtheGVzLnJlZ2lvbi52YXJpYWJsZSgpXTtcbiAgICAgICAgZGlzcGF0Y2gubW91c2VvdmVyLmNhbGwoZywgYXhlcy5yZWdpb24udmFyaWFibGUoKSwgcmVnaW9uLCBkKTtcbiAgICAgIH0pLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICB2YXIgcmVnaW9uID0gZFtheGVzLnJlZ2lvbi52YXJpYWJsZSgpXTtcbiAgICAgICAgZGlzcGF0Y2gubW91c2VvdXQuY2FsbChnLCBheGVzLnJlZ2lvbi52YXJpYWJsZSgpLCByZWdpb24sIGQpO1xuICAgICAgfSkub24oXCJjbGlja1wiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgIHZhciByZWdpb24gPSBkW2F4ZXMucmVnaW9uLnZhcmlhYmxlKCldO1xuICAgICAgICBkaXNwYXRjaC5jbGljay5jYWxsKGcsIGF4ZXMucmVnaW9uLnZhcmlhYmxlKCksIHJlZ2lvbiwgZCk7XG4gICAgICB9KTtcbiAgICAgIC8vIGZpbmlzaGVkIGRyYXdpbmcgY2FsbCByZWFkeSBldmVudFxuICAgICAgZGlzcGF0Y2gucmVhZHkuY2FsbChnKTtcbiAgICB9KTtcbiAgfSk7XG5cblxuICAvLyBMb2NhbCBldmVudCBoYW5kbGVyc1xuICBkaXNwYXRjaC5vbihcIm1vdXNlb3Zlci5ncmFwaFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICB0aGlzLnNlbGVjdEFsbChcInBhdGhcIikuY2xhc3NlZChcImNvbG91cmxvd1wiLCB0cnVlKTtcbiAgICB0aGlzLnNlbGVjdEFsbChcInBhdGhcIikuZmlsdGVyKGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHJldHVybiBkW3ZhcmlhYmxlXSA9PSB2YWx1ZTtcbiAgICB9KS5jbGFzc2VkKHtcImNvbG91cmhpZ2hcIjogdHJ1ZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgfSk7XG4gIGRpc3BhdGNoLm9uKFwibW91c2VvdXQuZ3JhcGhcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgdGhpcy5zZWxlY3RBbGwoXCJwYXRoXCIpLmNsYXNzZWQoe1wiY29sb3VyaGlnaFwiOiBmYWxzZSwgXCJjb2xvdXJsb3dcIjogZmFsc2V9KTtcbiAgfSk7XG4gIFxuICAvLyB0b29sdGlwXG4gIGlmIChkMy50aXAgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciB0aXAgPSBkMy50aXAoKS5kaXJlY3Rpb24oXCJzZVwiKS5hdHRyKCdjbGFzcycsICd0aXAgdGlwLW1hcCcpLmh0bWwoZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7IFxuICAgICAgdmFyIHNjaGVtYSA9IGdyYXBoLnNjaGVtYSgpO1xuICAgICAgdmFyIGZvcm1hdCA9IHZhbHVlX2Zvcm1hdHRlcihzY2hlbWEpO1xuICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgZm9yICh2YXIgaSBpbiBzY2hlbWEuZmllbGRzKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IHNjaGVtYS5maWVsZHNbaV07XG4gICAgICAgIHN0ciArPSBmaWVsZC50aXRsZSArICc6ICcgKyBmb3JtYXQoZCwgZmllbGQubmFtZSkgKyAnPC9icj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9KTtcbiAgICBkaXNwYXRjaC5vbihcInJlYWR5LnRpcFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2FsbCh0aXApO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoLm9uKFwibW91c2VvdmVyLnRpcFwiLCBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUsIGQpIHtcbiAgICAgIHRpcC5zaG93KHZhcmlhYmxlLCB2YWx1ZSwgZCk7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2gub24oXCJtb3VzZW91dC50aXBcIiwgZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlLCBkKSB7XG4gICAgICB0aXAuaGlkZSh2YXJpYWJsZSwgdmFsdWUsIGQpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGdyYXBoO1xufVxuXG4iLCJcbmZ1bmN0aW9uIGdycGhfbGFiZWxfc2l6ZShnKSB7XG5cbiAgLy8gYSBzdmcgb3IgZyBlbGVtZW50IHRvIHdoaWNoICB3ZSB3aWxsIGJlIGFkZGluZyBvdXIgbGFiZWwgaW4gb3JkZXIgdG9cbiAgLy8gcmVxdWVzdCBpdCdzIHNpemVcbiAgdmFyIGdfID0gZztcbiAgLy8gc3RvcmUgcHJldmlvdXNseSBjYWxjdWxhdGVkIHZhbHVlczsgYXMgdGhlIHNpemUgb2YgY2VydGFpbiBsYWJlbHMgYXJlIFxuICAvLyByZXF1ZXN0ZWQgYWdhaW4gYW5kIGFnYWluIHRoaXMgZ3JlYXRseSBlbmhhbmNlcyBwZXJmb3JtYW5jZVxuICB2YXIgc2l6ZXNfID0ge307XG5cbiAgZnVuY3Rpb24gbGFiZWxfc2l6ZShsYWJlbCkge1xuICAgIGlmIChzaXplc19bbGFiZWxdKSB7XG4gICAgICByZXR1cm4gc2l6ZXNfW2xhYmVsXTtcbiAgICB9XG4gICAgaWYgKCFnXykgcmV0dXJuIFt1bmRlZmluZWQsIHVuZGVmaW5lZF07XG4gICAgdmFyIHRleHQgPSBnXy5hcHBlbmQoXCJ0ZXh0XCIpLnRleHQobGFiZWwpO1xuICAgIHZhciBiYm94ID0gdGV4dFswXVswXS5nZXRCQm94KCk7XG4gICAgdmFyIHNpemUgPSBbYmJveC53aWR0aCoxLjIsIGJib3guaGVpZ2h0KjAuNjVdOyAvLyBUT0RPIHdoeTsgYW5kIGlzIHRoaXMgYWx3YXlzIGNvcnJlY3RcbiAgICAvL3ZhciBzaXplID0gaG9yaXpvbnRhbF8gPyB0ZXh0WzBdWzBdLmdldENvbXB1dGVkVGV4dExlbmd0aCgpIDpcbiAgICAgIC8vdGV4dFswXVswXS5nZXRCQm94KCkuaGVpZ2h0O1xuICAgIHRleHQucmVtb3ZlKCk7XG4gICAgc2l6ZXNfW2xhYmVsXSA9IHNpemU7XG4gICAgcmV0dXJuIHNpemU7XG4gIH1cblxuICBsYWJlbF9zaXplLnN2ZyA9IGZ1bmN0aW9uKGcpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGdfO1xuICAgIH0gZWxzZSB7XG4gICAgICBnXyA9IGc7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgbGFiZWxfc2l6ZS53aWR0aCA9IGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgdmFyIHNpemUgPSBsYWJlbF9zaXplKGxhYmVsKTtcbiAgICByZXR1cm4gc2l6ZVswXTtcbiAgfTtcblxuICBsYWJlbF9zaXplLmhlaWdodCA9IGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgdmFyIHNpemUgPSBsYWJlbF9zaXplKGxhYmVsKTtcbiAgICByZXR1cm4gc2l6ZVsxXTtcbiAgfTtcblxuICByZXR1cm4gbGFiZWxfc2l6ZTtcbn1cblxuIiwiXG5mdW5jdGlvbiBncnBoX3NjYWxlX2NhdGVnb3JpY2FsKCkge1xuXG4gIHZhciBkb21haW47XG4gIHZhciByYW5nZSA9IFswLCAxXTtcblxuICBmdW5jdGlvbiBzY2FsZSh2KSB7XG4gICAgdmFyIGkgPSBkb21haW4uaW5kZXhPZih2KTtcbiAgICBpZiAoaSA8IDApIHJldHVybiB7bDogdW5kZWZpbmVkLCBtOnVuZGVmaW5lZCwgdTp1bmRlZmluZWR9O1xuICAgIHZhciBidyA9IChyYW5nZVsxXSAtIHJhbmdlWzBdKSAvIGRvbWFpbi5sZW5ndGg7XG4gICAgdmFyIG0gPSBidyooaSArIDAuNSk7XG4gICAgdmFyIHcgPSBidyooMSAtIHNldHRpbmdzKFwiYmFyX3BhZGRpbmdcIikpKjAuNTtcbiAgICByZXR1cm4ge2w6bS13LCBtOm0sIHU6bSt3fTtcbiAgfVxuXG4gIHNjYWxlLmwgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHNjYWxlKHYpLmw7XG4gIH07XG5cbiAgc2NhbGUubSA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gc2NhbGUodikubTtcbiAgfTtcblxuICBzY2FsZS51ID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiBzY2FsZSh2KS51O1xuICB9O1xuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRvbWFpbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9tYWluID0gZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHJhbmdlO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5nZSA9IHI7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZG9tYWluO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuaWYgKGdycGguc2NhbGUgPT09IHVuZGVmaW5lZCkgZ3JwaC5zY2FsZSA9IHt9O1xuZ3JwaC5zY2FsZS5jYXRlZ29yaWNhbCA9IGdycGhfc2NhbGVfY2F0ZWdvcmljYWw7XG5cbiIsIlxuZnVuY3Rpb24gZ3JwaF9zY2FsZV9jaGxvcm9wbGV0aCgpIHtcblxuICB2YXIgZG9tYWluO1xuICB2YXIgYmFzZWNsYXNzID0gXCJjaGxvcm9cIjtcbiAgdmFyIG5jb2xvdXJzICA9IDk7XG5cbiAgZnVuY3Rpb24gc2NhbGUodikge1xuICAgIGlmIChkb21haW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYXNzdW1lIHdlIGhhdmUgb25seSAxIGNvbG91clxuICAgICAgcmV0dXJuIGJhc2VjbGFzcyArIFwiIFwiICsgYmFzZWNsYXNzICsgXCJuMVwiICsgXCIgXCIgKyBiYXNlY2xhc3MgKyAxO1xuICAgIH1cbiAgICB2YXIgcmFuZ2UgID0gZG9tYWluWzFdIC0gZG9tYWluWzBdO1xuICAgIHZhciB2YWwgICAgPSBNYXRoLnNxcnQoKHYgLSBkb21haW5bMF0pKjAuOTk5OSkgLyBNYXRoLnNxcnQocmFuZ2UpO1xuICAgIHZhciBjYXQgICAgPSBNYXRoLmZsb29yKHZhbCpuY29sb3Vycyk7XG4gICAgLy8gcmV0dXJucyBzb21ldGhpbmcgbGlrZSBcImNobG9ybyBjaGxvcm9uMTAgY2hsb3JvNFwiXG4gICAgcmV0dXJuIGJhc2VjbGFzcyArIFwiIFwiICsgYmFzZWNsYXNzICsgXCJuXCIgKyBuY29sb3VycyArIFwiIFwiICsgYmFzZWNsYXNzICsgKGNhdCsxKTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGRvbWFpbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9tYWluID0gZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJhc2VjbGFzcztcbiAgICB9IGVsc2Uge1xuICAgICAgYmFzZWNsYXNzID0gcjtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzdGVwID0gKGRvbWFpblsxXSAtIGRvbWFpblswXSkvbmNvbG91cnM7XG4gICAgdmFyIHQgPSBkb21haW5bMF07XG4gICAgdmFyIHRpY2tzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbmNvbG91cnM7ICsraSkge1xuICAgICAgdGlja3MucHVzaCh0KTtcbiAgICAgIHQgKz0gc3RlcDtcbiAgICB9XG4gICAgcmV0dXJuIHRpY2tzO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuaWYgKGdycGguc2NhbGUgPT09IHVuZGVmaW5lZCkgZ3JwaC5zY2FsZSA9IHt9O1xuZ3JwaC5zY2FsZS5jaGxvcm9wbGV0aCA9IGdycGhfc2NhbGVfY2hsb3JvcGxldGgoKTtcblxuIiwiXG5mdW5jdGlvbiBncnBoX3NjYWxlX2NvbG91cigpIHtcblxuICB2YXIgZG9tYWluO1xuICB2YXIgcmFuZ2UgPSBcImNvbG91clwiO1xuICB2YXIgbmNvbG91cnM7XG5cbiAgZnVuY3Rpb24gc2NhbGUodikge1xuICAgIGlmIChkb21haW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYXNzdW1lIHdlIGhhdmUgb25seSAxIGNvbG91clxuICAgICAgcmV0dXJuIHJhbmdlICsgXCIgXCIgKyByYW5nZSArIFwibjFcIiArIFwiIFwiICsgcmFuZ2UgKyAxO1xuICAgIH1cbiAgICB2YXIgaSA9IGRvbWFpbi5pbmRleE9mKHYpO1xuICAgIC8vIHJldHVybnMgc29tZXRoaW5nIGxpa2UgXCJjb2xvdXIgY29sb3VybjEwIGNvbG91cjRcIlxuICAgIHJldHVybiByYW5nZSArIFwiIFwiICsgcmFuZ2UgKyBcIm5cIiArIG5jb2xvdXJzICsgXCIgXCIgKyByYW5nZSArIChpKzEpO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZG9tYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb21haW4gPSBkO1xuICAgICAgbmNvbG91cnMgPSBkID8gZC5sZW5ndGg6IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHJhbmdlO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5nZSA9IHI7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZG9tYWluO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuaWYgKGdycGguc2NhbGUgPT09IHVuZGVmaW5lZCkgZ3JwaC5zY2FsZSA9IHt9O1xuZ3JwaC5zY2FsZS5jb2xvdXIgPSBncnBoX3NjYWxlX2NvbG91cigpO1xuIiwiXG5mdW5jdGlvbiBncnBoX3NjYWxlX2xpbmVhcigpIHtcblxuICB2YXIgbHNjYWxlID0gZDMuc2NhbGUubGluZWFyKCk7XG4gIHZhciBsYWJlbF9zaXplXyA9IDIwO1xuICB2YXIgcGFkZGluZ18gPSA1O1xuICB2YXIgbnRpY2tzXyA9IDEwO1xuICB2YXIgdGlja3NfO1xuICB2YXIgbmRlY187XG4gIHZhciBpbnNpZGVfID0gdHJ1ZTtcblxuICBmdW5jdGlvbiBzY2FsZSh2KSB7XG4gICAgcmV0dXJuIGxzY2FsZSh2KTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGxzY2FsZS5kb21haW4oKTtcbiAgICBkID0gbHNjYWxlLmRvbWFpbihkKTtcbiAgICBuZGVjXyA9IHVuZGVmaW5lZDtcbiAgICB0aWNrc18gPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihyKSB7XG4gICAgciA9IGxzY2FsZS5yYW5nZShyKTtcbiAgICBuZGVjXyA9IHVuZGVmaW5lZDtcbiAgICB0aWNrc18gPSB1bmRlZmluZWQ7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiByO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUubGFiZWxfc2l6ZSA9IGZ1bmN0aW9uKGxhYmVsX3NpemUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGxhYmVsX3NpemVfO1xuICAgIH0gZWxzZSB7XG4gICAgICBsYWJlbF9zaXplXyA9IGxhYmVsX3NpemU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gbHNpemUobGFiZWwpIHtcbiAgICB2YXIgc2l6ZSA9IHR5cGVvZihsYWJlbF9zaXplXykgPT0gXCJmdW5jdGlvblwiID8gbGFiZWxfc2l6ZV8obGFiZWwpIDogbGFiZWxfc2l6ZV87XG4gICAgc2l6ZSArPSBwYWRkaW5nXztcbiAgICByZXR1cm4gc2l6ZTtcbiAgfVxuXG4gIHNjYWxlLm50aWNrcyA9IGZ1bmN0aW9uKG4pIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG50aWNrc187XG4gICAgfSBlbHNlIHtcbiAgICAgIG50aWNrc18gPSBuO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLmluc2lkZSA9IGZ1bmN0aW9uKGkpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGluc2lkZV87XG4gICAgfSBlbHNlIHtcbiAgICAgIGluc2lkZV8gPSBpID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLm5pY2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgciA9IGxzY2FsZS5yYW5nZSgpO1xuICAgIHZhciBkID0gbHNjYWxlLmRvbWFpbigpO1xuICAgIHZhciBsID0gTWF0aC5hYnMoclsxXSAtIHJbMF0pO1xuICAgIHZhciB3ID0gd2lsa2luc29uX2lpKGRbMF0sIGRbMV0sIG50aWNrc18sIGxzaXplLCBsKTtcbiAgICBpZiAoaW5zaWRlXykge1xuICAgICAgdmFyIHcxID0gbHNpemUody5sYWJlbHNbMF0pO1xuICAgICAgdmFyIHcyID0gbHNpemUody5sYWJlbHNbdy5sYWJlbHMubGVuZ3RoLTFdKTtcbiAgICAgIHZhciBwYWQgPSB3MS8yICsgdzIvMjtcbiAgICAgIHcgPSB3aWxraW5zb25faWkoZFswXSwgZFsxXSwgbnRpY2tzXywgbHNpemUsIGwtcGFkKTtcbiAgICAgIGlmIChyWzBdIDwgclsxXSkge1xuICAgICAgICBsc2NhbGUucmFuZ2UoW3JbMF0rdzEvMiwgclsxXS13Mi8yXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsc2NhbGUucmFuZ2UoW3JbMF0tdzEvMiwgclsxXSt3Mi8yXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGRvbWFpbiA9IFt3LmxtaW4sIHcubG1heF07XG4gICAgbHNjYWxlLmRvbWFpbihbdy5sbWluLCB3LmxtYXhdKTtcbiAgICB0aWNrc18gPSB3LmxhYmVscztcbiAgICBuZGVjXyA9IHcubmRlYztcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aWNrc18gPT09IHVuZGVmaW5lZCkgcmV0dXJuIGxzY2FsZS50aWNrcyhudGlja3NfKTtcbiAgICByZXR1cm4gdGlja3NfLm1hcChmdW5jdGlvbih0KSB7IHJldHVybiBmb3JtYXRfbnVtYmVyKHQsIFwiXCIsIG5kZWNfKTt9KTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmlmIChncnBoLnNjYWxlID09PSB1bmRlZmluZWQpIGdycGguc2NhbGUgPSB7fTtcbmdycGguc2NhbGUubGluZWFyID0gZ3JwaF9zY2FsZV9saW5lYXIoKTtcblxuIiwiZnVuY3Rpb24gZ3JwaF9zY2FsZV9wZXJpb2QoKSB7XG5cbiAgdmFyIHRpbWVfc2NhbGUgPSBkMy50aW1lLnNjYWxlKCk7XG4gIHZhciB5ZWFyc187XG4gIHZhciBoYXNfbW9udGhfID0gZmFsc2U7XG4gIHZhciBoYXNfcXVhcnRlcl8gPSBmYWxzZTtcblxuICBmdW5jdGlvbiBzY2FsZSh2YWwpIHtcbiAgICBpZiAoKHZhbCBpbnN0YW5jZW9mIERhdGUpIHx8IG1vbWVudC5pc01vbWVudCh2YWwpKSB7XG4gICAgICByZXR1cm4gdGltZV9zY2FsZSh2YWwpO1xuICAgIH0gZWxzZSBpZiAodmFsICYmIHZhbC5kYXRlICYmIHZhbC5wZXJpb2QpIHtcbiAgICAgIHRpbWVfc2NhbGUodmFsLmRhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWwgPSBcIlwiICsgdmFsO1xuICAgICAgcmV0dXJuIHRpbWVfc2NhbGUoZGF0ZV9wZXJpb2QodmFsKS5kYXRlKTtcbiAgICB9XG4gIH1cblxuICBzY2FsZS5oYXNfbW9udGggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaGFzX21vbnRoXztcbiAgfTtcblxuICBzY2FsZS5oYXNfcXVhcnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBoYXNfcXVhcnRlcl87XG4gIH07XG5cbiAgZnVuY3Rpb24gZGV0ZXJtaW5lX2RvbWFpbihwZXJpb2RzKSB7XG4gICAgdmFyIG1pbiA9IGQzLm1pbihwZXJpb2RzLCBmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gZC5wZXJpb2Quc3RhcnQ7XG4gICAgfSk7XG4gICAgdmFyIG1heCA9IGQzLm1heChwZXJpb2RzLCBmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gZC5wZXJpb2QuZW5kO1xuICAgIH0pO1xuICAgIHZhciB5ZWFyX21pbiA9IG1pbi55ZWFyKCk7XG4gICAgdmFyIHllYXJfbWF4ID0gbWF4LnllYXIoKTtcbiAgICAvLyBmaXJzdCBhdHRlbXB0OiBwbG90IGNvbXBsZXRlIHllYXJzXG4gICAgdmFyIGRvbWFpbl9taW4gPSBuZXcgRGF0ZSh5ZWFyX21pbiArIFwiLTAxLTAxXCIpO1xuICAgIHZhciBkb21haW5fbWF4ID0gbmV3IERhdGUoKHllYXJfbWF4KzEpICsgXCItMDEtMDFcIik7XG4gICAgdmFyIGNvdmVyYWdlID0gKG1heCAtIG1pbikgLyAoZG9tYWluX21heCAtIGRvbWFpbl9taW4pO1xuICAgIGlmIChjb3ZlcmFnZSA+IHNldHRpbmdzKCdwZXJpb2RfY292ZXJhZ2UnKSkgcmV0dXJuIFtkb21haW5fbWluLCBkb21haW5fbWF4XTtcbiAgICAvLyBub3QgZW5vdWdoIGNvdmVyYWdlOyBkZXRlcm1pbmUgaWYgc3RhcnRpbmcgeWVhciBvciBsYXN0IHllYXIgaGFzIGxlYXN0IFxuICAgIC8vIGNvdmVyYWdlXG4gICAgdmFyIHllYXJfbWluX2NvdmVyYWdlID0gbmV3IERhdGUoKHllYXJfbWluKzEpICsgXCItMDEtMDFcIikgLSBtaW47XG4gICAgdmFyIHllYXJfbWF4X2NvdmVyYWdlID0gbWF4IC0gbmV3IERhdGUoeWVhcl9tYXggKyBcIi0wMS0wMVwiKTtcbiAgICBpZiAoeWVhcl9taW5fY292ZXJhZ2UgPj0geWVhcl9tYXhfY292ZXJhZ2UpIHtcbiAgICAgIGRvbWFpbl9tYXggPSBtYXg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvbWFpbl9taW4gPSBtaW47XG4gICAgfVxuICAgIGNvdmVyYWdlID0gKG1heCAtIG1pbikgLyAoZG9tYWluX21heCAtIGRvbWFpbl9taW4pO1xuICAgIGlmIChjb3ZlcmFnZSA+IHNldHRpbmdzKCdwZXJpb2RfY292ZXJhZ2UnKSkgcmV0dXJuIFtkb21haW5fbWluLCBkb21haW5fbWF4XTtcbiAgICAvLyBzdGlsbCBub3QgZW5vdWdoIGNvdmVyYWdlOyBzZXQgZG9tYWluIGVxdWFsIHRvIHJhbmdlXG4gICAgZG9tYWluX21pbiA9IG1pbjtcbiAgICBkb21haW5fbWF4ID0gbWF4O1xuICAgIHJldHVybiBbZG9tYWluX21pbiwgZG9tYWluX21heF07XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihkb21haW4pIHtcbiAgICB2YXIgcGVyaW9kcyA9IGRvbWFpbi5tYXAoZGF0ZV9wZXJpb2QpO1xuICAgIC8vIGRldGVybWluZSB3aGljaCB5ZWFycyBhcmUgaW4gZG9tYWluO1xuICAgIHllYXJzXyA9IGQzLmV4dGVudChwZXJpb2RzLCBmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gZC5wZXJpb2Quc3RhcnQueWVhcigpO1xuICAgIH0pO1xuICAgIC8vIHNldCBkb21haW5cbiAgICB0aW1lX3NjYWxlLmRvbWFpbihkZXRlcm1pbmVfZG9tYWluKHBlcmlvZHMpKTtcbiAgICAvLyBkZXRlcm1pbmUgd2hpY2ggc3VidW5pdHMgb2YgeWVhcnMgc2hvdWxkIGJlIGRyYXduXG4gICAgaGFzX21vbnRoXyA9IHBlcmlvZHMucmVkdWNlKGZ1bmN0aW9uKHAsIGQpIHtcbiAgICAgIHJldHVybiBwIHx8IGQudHlwZSA9PSBcIm1vbnRoXCI7XG4gICAgfSwgZmFsc2UpO1xuICAgIGhhc19xdWFydGVyXyA9IHBlcmlvZHMucmVkdWNlKGZ1bmN0aW9uKHAsIGQpIHtcbiAgICAgIHJldHVybiBwIHx8IGQudHlwZSA9PSBcInF1YXJ0ZXJcIjtcbiAgICB9LCBmYWxzZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihyYW5nZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdGltZV9zY2FsZS5yYW5nZSgpO1xuICAgIHRpbWVfc2NhbGUucmFuZ2UocmFuZ2UpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gaXNfaW5zaWRlX2RvbWFpbihwZXJpb2QsIGRvbWFpbikge1xuICAgICAgcmV0dXJuIChwZXJpb2QucGVyaW9kLnN0YXJ0ID49IGRvbWFpblswXSkgJiYgXG4gICAgICAgIChwZXJpb2QucGVyaW9kLmVuZCA8PSBkb21haW5bMV0pO1xuICAgIH1cblxuICAgIHZhciB0aWNrcyA9IFtdO1xuICAgIGZvciAodmFyIHllYXIgPSB5ZWFyc19bMF07IHllYXIgPD0geWVhcnNfWzFdOyB5ZWFyKyspIHtcbiAgICAgIHZhciB0aWNrID0gZGF0ZV9wZXJpb2QoeWVhciArIFwiLTAxLTAxL1AxWVwiKTtcbiAgICAgIHRpY2subGFzdCA9IHllYXIgPT0geWVhcnNfWzFdO1xuICAgICAgdGljay5sYWJlbCA9IHllYXI7XG4gICAgICBpZiAoaXNfaW5zaWRlX2RvbWFpbih0aWNrLCB0aW1lX3NjYWxlLmRvbWFpbigpKSkgdGlja3MucHVzaCh0aWNrKTtcblxuICAgICAgaWYgKHNjYWxlLmhhc19xdWFydGVyKCkpIHtcbiAgICAgICAgZm9yICh2YXIgcSA9IDA7IHEgPCA0OyBxKyspIHtcbiAgICAgICAgICB0aWNrID0gZGF0ZV9wZXJpb2QoeWVhciArIFwiLVwiICsgemVyb19wYWQocSozKzEsIDIpICsgXCItMDEvUDNNXCIpO1xuICAgICAgICAgIHRpY2subGFzdCA9IHEgPT0gMztcbiAgICAgICAgICB0aWNrLmxhYmVsID0gcSsxO1xuICAgICAgICAgIGlmIChpc19pbnNpZGVfZG9tYWluKHRpY2ssIHRpbWVfc2NhbGUuZG9tYWluKCkpKVxuICAgICAgICAgICAgdGlja3MucHVzaCh0aWNrKTtcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICAgIGlmIChzY2FsZS5oYXNfbW9udGgoKSkge1xuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IDEyOyBtKyspIHtcbiAgICAgICAgICB0aWNrID0gZGF0ZV9wZXJpb2QoeWVhciArIFwiLVwiICsgemVyb19wYWQobSsxLDIpICsgXCItMDEvUDFNXCIpO1xuICAgICAgICAgIHRpY2subGFzdCA9IChzY2FsZS5oYXNfcXVhcnRlcigpICYmICgobSsxKSAlIDMpID09PSAwKSB8fCBtID09IDExO1xuICAgICAgICAgIHRpY2subGFiZWwgPSBtKzE7XG4gICAgICAgICAgaWYgKGlzX2luc2lkZV9kb21haW4odGljaywgdGltZV9zY2FsZS5kb21haW4oKSkpXG4gICAgICAgICAgICB0aWNrcy5wdXNoKHRpY2spO1xuICAgICAgICB9XG4gICAgICB9IFxuICAgIH1cbiAgICByZXR1cm4gdGlja3M7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5cbmlmIChncnBoLnNjYWxlID09PSB1bmRlZmluZWQpIGdycGguc2NhbGUgPSB7fTtcbmdycGguc2NhbGUucGVyaW9kID0gZ3JwaF9zY2FsZV9wZXJpb2QoKTtcblxuIiwiXG5mdW5jdGlvbiBncnBoX3NjYWxlX3NpemUoKSB7XG4gIFxuICB2YXIgbWF4O1xuICB2YXIgZG9tYWluO1xuXG4gIGZ1bmN0aW9uIHNjYWxlKHYpIHtcbiAgICBpZiAoZG9tYWluID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzZXR0aW5ncyhcImRlZmF1bHRfYnViYmxlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbSA9IG1heCA9PT0gdW5kZWZpbmVkID8gc2V0dGluZ3MoXCJtYXhfYnViYmxlXCIpIDogbWF4O1xuICAgICAgcmV0dXJuIG0gKiBNYXRoLnNxcnQodikvTWF0aC5zcXJ0KGRvbWFpblsxXSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZG9tYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb21haW4gPSBkMy5leHRlbnQoZCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBtYXggPT09IHVuZGVmaW5lZCA/IHNldHRpbmdzKFwibWF4X2J1YmJsZVwiKSA6IG1heDtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF4ID0gZDMubWF4KHIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmlmIChncnBoLnNjYWxlID09PSB1bmRlZmluZWQpIGdycGguc2NhbGUgPSB7fTtcbmdycGguc2NhbGUuc2l6ZSA9IGdycGhfc2NhbGVfc2l6ZSgpO1xuXG4iLCJcblxudmFyIHNldHRpbmdzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzID0ge1xuICAgICdkZWZhdWx0JyA6IHtcbiAgICAgICdwYWRkaW5nJyA6IFsyLCAyLCAyLCAyXSxcbiAgICAgICdsYWJlbF9wYWRkaW5nJyA6IDQsXG4gICAgICAnc2VwJyA6IDgsXG4gICAgICAncG9pbnRfc2l6ZScgOiA0LFxuICAgICAgJ21heF9idWJibGUnIDogMjAsXG4gICAgICAnZGVmYXVsdF9idWJibGUnIDogNSxcbiAgICAgICdiYXJfcGFkZGluZycgOiAwLjQsXG4gICAgICAndGlja19sZW5ndGgnIDogNSxcbiAgICAgICd0aWNrX3BhZGRpbmcnIDogMixcbiAgICAgICdwZXJpb2RfY292ZXJhZ2UnIDogMC44NVxuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBnZXQoc2V0dGluZywgdHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICBpZiAoc1t0eXBlXSAhPT0gdW5kZWZpbmVkICYmIHNbdHlwZV1bc2V0dGluZ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gc1t0eXBlXVtzZXR0aW5nXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzLmRlZmF1bHRbc2V0dGluZ107XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzLmRlZmF1bHRbc2V0dGluZ107XG4gICAgfVxuICB9XG5cbiAgZ2V0LnNldCA9IGZ1bmN0aW9uKHNldHRpbmcsIGEsIGIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcy5kZWZhdWx0W3NldHRpbmddID0gYTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgaWYgKHNbYV0gPT09IHVuZGVmaW5lZCkgc1thXSA9IHt9O1xuICAgICAgc1thXVtzZXR0aW5nXSA9IGI7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTmVlZCBhdCBsZWF0IHR3byBhcmd1bWVudHMuXCIpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZ2V0O1xufSgpO1xuXG5ncnBoLnNldHRpbmdzID0gc2V0dGluZ3M7XG4iLCJcbi8vIENvbnZlcnQgYSBudW1iZXIgdG8gc3RyaW5nIHBhZGRpbmcgaXQgd2l0aCB6ZXJvcyB1bnRpbCB0aGUgbnVtYmVyIG9mIFxuLy8gY2hhcmFjdGVycyBiZWZvcmUgdGhlIGRlY2ltYWwgc3ltYm9sIGVxdWFscyBsZW5ndGggKG5vdCBpbmNsdWRpbmcgc2lnbilcbmZ1bmN0aW9uIHplcm9fcGFkKG51bSwgbGVuZ3RoKSB7XG4gIHZhciBuID0gTWF0aC5hYnMobnVtKTtcbiAgdmFyIG56ZXJvcyA9IE1hdGgubWF4KDAsIGxlbmd0aCAtIE1hdGguZmxvb3IobikudG9TdHJpbmcoKS5sZW5ndGggKTtcbiAgdmFyIHBhZGRpbmcgPSBNYXRoLnBvdygxMCwgbnplcm9zKS50b1N0cmluZygpLnN1YnN0cigxKTtcbiAgaWYoIG51bSA8IDAgKSB7XG4gICAgcGFkZGluZyA9ICctJyArIHBhZGRpbmc7XG4gIH1cbiAgcmV0dXJuIHBhZGRpbmcgKyBuO1xufVxuXG5cbi8vIEZvcm1hdCBhIG51bWVyaWMgdmFsdWU6XG4vLyAtIE1ha2Ugc3VyZSBpdCBpcyByb3VuZGVkIHRvIHRoZSBjb3JyZWN0IG51bWJlciBvZiBkZWNpbWFscyAobmRlYylcbi8vIC0gVXNlIHRoZSBjb3JyZWN0IGRlY2ltYWwgc2VwYXJhdG9yIChkZWMpXG4vLyAtIEFkZCBhIHRob3VzYW5kcyBzZXBhcmF0b3IgKGdycClcbmZ1bmN0aW9uIGZvcm1hdF9udW1iZXIobGFiZWwsIHVuaXQsIG5kZWMsIGRlYywgZ3JwKSB7XG4gIGlmIChpc05hTihsYWJlbCkpIHJldHVybiAnJztcbiAgaWYgKHVuaXQgPT09IHVuZGVmaW5lZCkgdW5pdCA9ICcnO1xuICBpZiAoZGVjID09PSB1bmRlZmluZWQpIGRlYyA9ICcuJztcbiAgaWYgKGdycCA9PT0gdW5kZWZpbmVkKSBncnAgPSAnJztcbiAgLy8gcm91bmQgbnVtYmVyXG4gIGlmIChuZGVjICE9PSB1bmRlZmluZWQpIHtcbiAgICBsYWJlbCA9IGxhYmVsLnRvRml4ZWQobmRlYyk7XG4gIH0gZWxzZSB7XG4gICAgbGFiZWwgPSBsYWJlbC50b1N0cmluZygpO1xuICB9XG4gIC8vIEZvbGxvd2luZyBiYXNlZCBvbiBjb2RlIGZyb20gXG4gIC8vIGh0dHA6Ly93d3cubXJlZGtqLmNvbS9qYXZhc2NyaXB0L251bWJlckZvcm1hdC5odG1sXG4gIHggICAgID0gbGFiZWwuc3BsaXQoJy4nKTtcbiAgeDEgICAgPSB4WzBdO1xuICB4MiAgICA9IHgubGVuZ3RoID4gMSA/IGRlYyArIHhbMV0gOiAnJztcbiAgaWYgKGdycCAhPT0gJycpIHtcbiAgICB2YXIgcmd4ID0gLyhcXGQrKShcXGR7M30pLztcbiAgICB3aGlsZSAocmd4LnRlc3QoeDEpKSB7XG4gICAgICB4MSA9IHgxLnJlcGxhY2Uocmd4LCAnJDEnICsgZ3JwICsgJyQyJyk7XG4gICAgfVxuICB9XG4gIHJldHVybih4MSArIHgyICsgdW5pdCk7XG59XG5cblxuXG4iLCJcbi8vIEZvcm1hdCBhIG51bWVyaWMgdmFsdWU6XG4vLyAtIE1ha2Ugc3VyZSBpdCBpcyByb3VuZGVkIHRvIHRoZSBjb3JyZWN0IG51bWJlciBvZiBkZWNpbWFscyAobmRlYylcbi8vIC0gVXNlIHRoZSBjb3JyZWN0IGRlY2ltYWwgc2VwYXJhdG9yIChkZWMpXG4vLyAtIEFkZCBhIHRob3VzYW5kcyBzZXBhcmF0b3IgKGdycClcbmZvcm1hdF9udW1lcmljID0gZnVuY3Rpb24obGFiZWwsIHVuaXQsIG5kZWMsIGRlYywgZ3JwKSB7XG4gIGlmIChpc05hTihsYWJlbCkpIHJldHVybiAnJztcbiAgaWYgKHVuaXQgPT09IHVuZGVmaW5lZCkgdW5pdCA9ICcnO1xuICBpZiAoZGVjID09PSB1bmRlZmluZWQpIGRlYyA9ICcsJztcbiAgaWYgKGdycCA9PT0gdW5kZWZpbmVkKSBncnAgPSAnICc7XG4gIC8vIHJvdW5kIG51bWJlclxuICBpZiAobmRlYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGFiZWwgPSBsYWJlbC50b0ZpeGVkKG5kZWMpO1xuICB9IGVsc2Uge1xuICAgIGxhYmVsID0gbGFiZWwudG9TdHJpbmcoKTtcbiAgfVxuICAvLyBGb2xsb3dpbmcgYmFzZWQgb24gY29kZSBmcm9tIFxuICAvLyBodHRwOi8vd3d3Lm1yZWRrai5jb20vamF2YXNjcmlwdC9udW1iZXJGb3JtYXQuaHRtbFxuICB4ICAgICA9IGxhYmVsLnNwbGl0KCcuJyk7XG4gIHgxICAgID0geFswXTtcbiAgeDIgICAgPSB4Lmxlbmd0aCA+IDEgPyBkZWMgKyB4WzFdIDogJyc7XG4gIGlmIChncnAgIT09ICcnKSB7XG4gICAgdmFyIHJneCA9IC8oXFxkKykoXFxkezN9KS87XG4gICAgd2hpbGUgKHJneC50ZXN0KHgxKSkge1xuICAgICAgeDEgPSB4MS5yZXBsYWNlKHJneCwgJyQxJyArIGdycCArICckMicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4oeDEgKyB4MiArIHVuaXQpO1xufTtcblxuXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vID09PT0gICAgICAgICAgICAgICAgICAgICAgICAgV0lMS0lOU09OIEFMR09SSVRITSAgICAgICAgICAgICAgICAgICAgICAgID09PT1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG5mdW5jdGlvbiB3aWxraW5zb25faWkoZG1pbiwgZG1heCwgbSwgY2FsY19sYWJlbF93aWR0aCwgYXhpc193aWR0aCwgbW1pbiwgbW1heCwgUSwgcHJlY2lzaW9uLCBtaW5jb3ZlcmFnZSkge1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09IFNVQlJPVVRJTkVTID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8vIFRoZSBmb2xsb3dpbmcgcm91dGluZSBjaGVja3MgZm9yIG92ZXJsYXAgaW4gdGhlIGxhYmVscy4gVGhpcyBpcyB1c2VkIGluIHRoZSBcbiAgLy8gV2lsa2luc29uIGxhYmVsaW5nIGFsZ29yaXRobSBiZWxvdyB0byBlbnN1cmUgdGhhdCB0aGUgbGFiZWxzIGRvIG5vdCBvdmVybGFwLlxuICBmdW5jdGlvbiBvdmVybGFwKGxtaW4sIGxtYXgsIGxzdGVwLCBjYWxjX2xhYmVsX3dpZHRoLCBheGlzX3dpZHRoLCBuZGVjKSB7XG4gICAgdmFyIHdpZHRoX21heCA9IGxzdGVwKmF4aXNfd2lkdGgvKGxtYXgtbG1pbik7XG4gICAgZm9yICh2YXIgbCA9IGxtaW47IChsIC0gbG1heCkgPD0gMUUtMTA7IGwgKz0gbHN0ZXApIHtcbiAgICAgIHZhciB3ICA9IGNhbGNfbGFiZWxfd2lkdGgobCwgbmRlYyk7XG4gICAgICBpZiAodyA+IHdpZHRoX21heCkgcmV0dXJuKHRydWUpO1xuICAgIH1cbiAgICByZXR1cm4oZmFsc2UpO1xuICB9XG5cbiAgLy8gUGVyZm9ybSBvbmUgaXRlcmF0aW9uIG9mIHRoZSBXaWxraW5zb24gYWxnb3JpdGhtXG4gIGZ1bmN0aW9uIHdpbGtpbnNvbl9zdGVwKG1pbiwgbWF4LCBrLCBtLCBRLCBtaW5jb3ZlcmFnZSkge1xuICAgIC8vIGRlZmF1bHQgdmFsdWVzXG4gICAgUSAgICAgICAgICAgICAgID0gUSAgICAgICAgIHx8IFsxMCwgMSwgNSwgMiwgMi41LCAzLCA0LCAxLjUsIDcsIDYsIDgsIDldO1xuICAgIHByZWNpc2lvbiAgICAgICA9IHByZWNpc2lvbiB8fCBbMSwgIDAsIDAsIDAsICAtMSwgMCwgMCwgIC0xLCAwLCAwLCAwLCAwXTtcbiAgICBtaW5jb3ZlcmFnZSAgICAgPSBtaW5jb3ZlcmFnZSB8fCAwLjg7XG4gICAgbSAgICAgICAgICAgICAgID0gbSB8fCBrO1xuICAgIC8vIGNhbGN1bGF0ZSBzb21lIHN0YXRzIG5lZWRlZCBpbiBsb29wXG4gICAgdmFyIGludGVydmFscyAgID0gayAtIDE7XG4gICAgdmFyIGRlbHRhICAgICAgID0gKG1heCAtIG1pbikgLyBpbnRlcnZhbHM7XG4gICAgdmFyIGJhc2UgICAgICAgID0gTWF0aC5mbG9vcihNYXRoLmxvZyhkZWx0YSkvTWF0aC5MTjEwKTtcbiAgICB2YXIgZGJhc2UgICAgICAgPSBNYXRoLnBvdygxMCwgYmFzZSk7XG4gICAgLy8gY2FsY3VsYXRlIGdyYW51bGFyaXR5OyBvbmUgb2YgdGhlIHRlcm1zIGluIHNjb3JlXG4gICAgdmFyIGdyYW51bGFyaXR5ID0gMSAtIE1hdGguYWJzKGstbSkvbTtcbiAgICAvLyBpbml0aWFsaXNlIGVuZCByZXN1bHRcbiAgICB2YXIgYmVzdDtcbiAgICAvLyBsb29wIHRocm91Z2ggYWxsIHBvc3NpYmxlIGxhYmVsIHBvc2l0aW9ucyB3aXRoIGdpdmVuIGtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgUS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gY2FsY3VsYXRlIGxhYmVsIHBvc2l0aW9uc1xuICAgICAgdmFyIHRkZWx0YSA9IFFbaV0gKiBkYmFzZTtcbiAgICAgIHZhciB0bWluICAgPSBNYXRoLmZsb29yKG1pbi90ZGVsdGEpICogdGRlbHRhO1xuICAgICAgdmFyIHRtYXggICA9IHRtaW4gKyBpbnRlcnZhbHMgKiB0ZGVsdGE7XG4gICAgICAvLyBjYWxjdWxhdGUgdGhlIG51bWJlciBvZiBkZWNpbWFsc1xuICAgICAgdmFyIG5kZWMgICA9IChiYXNlICsgcHJlY2lzaW9uW2ldKSA8IDAgPyBNYXRoLmFicyhiYXNlICsgcHJlY2lzaW9uW2ldKSA6IDA7XG4gICAgICAvLyBpZiBsYWJlbCBwb3NpdGlvbnMgY292ZXIgcmFuZ2VcbiAgICAgIGlmICh0bWluIDw9IG1pbiAmJiB0bWF4ID49IG1heCkge1xuICAgICAgICAvLyBjYWxjdWxhdGUgcm91bmRuZXNzIGFuZCBjb3ZlcmFnZSBwYXJ0IG9mIHNjb3JlXG4gICAgICAgIHZhciByb3VuZG5lc3MgPSAxIC0gKGkgLSAodG1pbiA8PSAwICYmIHRtYXggPj0gMCkpIC8gUS5sZW5ndGg7XG4gICAgICAgIHZhciBjb3ZlcmFnZSAgPSAobWF4LW1pbikvKHRtYXgtdG1pbik7XG4gICAgICAgIC8vIGlmIGNvdmVyYWdlIGhpZ2ggZW5vdWdoXG4gICAgICAgIGlmIChjb3ZlcmFnZSA+IG1pbmNvdmVyYWdlICYmICFvdmVybGFwKHRtaW4sIHRtYXgsIHRkZWx0YSwgY2FsY19sYWJlbF93aWR0aCwgYXhpc193aWR0aCwgbmRlYykpIHtcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgc2NvcmVcbiAgICAgICAgICB2YXIgdG5pY2UgPSBncmFudWxhcml0eSArIHJvdW5kbmVzcyArIGNvdmVyYWdlO1xuICAgICAgICAgIC8vIGlmIGhpZ2hlc3Qgc2NvcmVcbiAgICAgICAgICBpZiAoKGJlc3QgPT09IHVuZGVmaW5lZCkgfHwgKHRuaWNlID4gYmVzdC5zY29yZSkpIHtcbiAgICAgICAgICAgIGJlc3QgPSB7XG4gICAgICAgICAgICAgICAgJ2xtaW4nICA6IHRtaW4sXG4gICAgICAgICAgICAgICAgJ2xtYXgnICA6IHRtYXgsXG4gICAgICAgICAgICAgICAgJ2xzdGVwJyA6IHRkZWx0YSxcbiAgICAgICAgICAgICAgICAnc2NvcmUnIDogdG5pY2UsXG4gICAgICAgICAgICAgICAgJ25kZWMnICA6IG5kZWNcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmV0dXJuXG4gICAgcmV0dXJuIChiZXN0KTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gTUFJTiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIGRlZmF1bHQgdmFsdWVzXG4gIGRtaW4gICAgICAgICAgICAgPSBOdW1iZXIoZG1pbik7XG4gIGRtYXggICAgICAgICAgICAgPSBOdW1iZXIoZG1heCk7XG4gIGlmIChNYXRoLmFicyhkbWluIC0gZG1heCkgPCAxRS0xMCkge1xuICAgIGRtaW4gPSAwLjk2KmRtaW47XG4gICAgZG1heCA9IDEuMDQqZG1heDtcbiAgfVxuICBjYWxjX2xhYmVsX3dpZHRoID0gY2FsY19sYWJlbF93aWR0aCB8fCBmdW5jdGlvbigpIHsgcmV0dXJuKDApO307XG4gIGF4aXNfd2lkdGggICAgICAgPSBheGlzX3dpZHRoIHx8IDE7XG4gIFEgICAgICAgICAgICAgICAgPSBRICAgICAgICAgfHwgWzEwLCAxLCA1LCAyLCAyLjUsIDMsIDQsIDEuNSwgNywgNiwgOCwgOV07XG4gIHByZWNpc2lvbiAgICAgICAgPSBwcmVjaXNpb24gfHwgWzEsICAwLCAwLCAwLCAgLTEsIDAsIDAsICAtMSwgMCwgMCwgMCwgMF07XG4gIG1pbmNvdmVyYWdlICAgICAgPSBtaW5jb3ZlcmFnZSB8fCAwLjg7XG4gIG1taW4gICAgICAgICAgICAgPSBtbWluIHx8IDI7XG4gIG1tYXggICAgICAgICAgICAgPSBtbWF4IHx8IE1hdGguY2VpbCg2Km0pO1xuICAvLyBpbml0aWxpc2UgZW5kIHJlc3VsdFxuICB2YXIgYmVzdCA9IHtcbiAgICAgICdsbWluJyAgOiBkbWluLFxuICAgICAgJ2xtYXgnICA6IGRtYXgsXG4gICAgICAnbHN0ZXAnIDogKGRtYXggLSBkbWluKSxcbiAgICAgICdzY29yZScgOiAtMUU4LFxuICAgICAgJ25kZWMnICA6IDBcbiAgICB9O1xuICAvLyBjYWxjdWxhdGUgbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gIHZhciB4ID0gU3RyaW5nKGJlc3QubHN0ZXApLnNwbGl0KCcuJyk7XG4gIGJlc3QubmRlYyA9IHgubGVuZ3RoID4gMSA/IHhbMV0ubGVuZ3RoIDogMDtcbiAgLy8gbG9vcCB0aG91Z2ggYWxsIHBvc3NpYmxlIG51bWJlcnMgb2YgbGFiZWxzXG4gIGZvciAodmFyIGsgPSBtbWluOyBrIDw9IG1tYXg7IGsrKykgeyBcbiAgICAvLyBjYWxjdWxhdGUgYmVzdCBsYWJlbCBwb3NpdGlvbiBmb3IgY3VycmVudCBudW1iZXIgb2YgbGFiZWxzXG4gICAgdmFyIHJlc3VsdCA9IHdpbGtpbnNvbl9zdGVwKGRtaW4sIGRtYXgsIGssIG0sIFEsIG1pbmNvdmVyYWdlKTtcbiAgICAvLyBjaGVjayBpZiBjdXJyZW50IHJlc3VsdCBoYXMgaGlnaGVyIHNjb3JlXG4gICAgaWYgKChyZXN1bHQgIT09IHVuZGVmaW5lZCkgJiYgKChiZXN0ID09PSB1bmRlZmluZWQpIHx8IChyZXN1bHQuc2NvcmUgPiBiZXN0LnNjb3JlKSkpIHtcbiAgICAgIGJlc3QgPSByZXN1bHQ7XG4gICAgfVxuICB9XG4gIC8vIGdlbmVyYXRlIGxhYmVsIHBvc2l0aW9uc1xuICB2YXIgbGFiZWxzID0gW107XG4gIGZvciAodmFyIGwgPSBiZXN0LmxtaW47IChsIC0gYmVzdC5sbWF4KSA8PSAxRS0xMDsgbCArPSBiZXN0LmxzdGVwKSB7XG4gICAgbGFiZWxzLnB1c2gobCk7XG4gIH1cbiAgYmVzdC5sYWJlbHMgPSBsYWJlbHM7XG4gIHJldHVybihiZXN0KTtcbn1cblxuXG4iLCIgIFxuICBncnBoLmxpbmUgPSBncnBoX2dyYXBoX2xpbmU7XG4gIGdycGgubWFwID0gZ3JwaF9ncmFwaF9tYXA7XG4gIGdycGguYnViYmxlID0gZ3JwaF9ncmFwaF9idWJibGU7XG4gIGdycGguYmFyID0gZ3JwaF9ncmFwaF9iYXI7XG5cbiAgdGhpcy5ncnBoID0gZ3JwaDtcblxufSgpKTtcblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
