var utils = require('../lib/core/time/utils.js');
var moment = require('vis/node_modules/moment');

/*
NOTE - numeric values in these tests (and the API) are all milliseconds
       despite looking like years - party like it's "1970-01-01T00:00:01.999Z"!
*/
describe("test utils", function() {
    it("tests finding", function() {
        var data = [1,5,10];
        expect(utils.find(data, 0)).toBe(0);
        expect(utils.find(data, 1)).toBe(0);
        expect(utils.find(data, 2)).toBe(0);
        expect(utils.find(data, 5)).toBe(1);
        expect(utils.find(data, 6)).toBe(1);
        expect(utils.find(data, 10)).toBe(2);
        expect(utils.find(data, 11)).toBe(2);
    });
    describe("range", function() {
        it("createRange works", function() {
            var r;
            // text
            r = utils.createRange('2000', '2001');
            expect(r.start).toBe(Date.parse('2000'));
            expect(r.end).toBe(Date.parse('2001'));
            // numbers (millis)
            r = utils.createRange(2000, 2003);
            expect(r.start).toBe(2000);
            expect(r.end).toBe(2003);
            // copy
            r = utils.createRange(r);
            expect(r.start).toBe(2000);
            expect(r.end).toBe(2003);
            // single arg
            r = utils.createRange(1999);
            expect(r.start).toBe(1999);
            expect(r.end).toBe(1999);
            // null 1st arg (open range)
            r = utils.createRange(1999, null);
            expect(r.start).toBe(1999);
            expect(r.end).toBe(null);
            // null 2nd arg (open range)
            r = utils.createRange(null, 6789);
            expect(r.start).toBe(null);
            expect(r.end).toBe(6789);
        });
        it("basics work", function() {
            var r = utils.createRange(2000, 2003);
            expect(r.center()).toBe(2001);
            expect(r.width()).toBe(3);
        });
        it("extend works", function() {
            var r = utils.createRange(2000, 2003);
            // idempotent
            r.extend(r);
            expect(r.start).toBe(2000);
            expect(r.end).toBe(2003);
            // single left
            r.extend(1995);
            expect(r.start).toBe(1995);
            expect(r.end).toBe(2003);
            // single right
            r.extend(2004);
            expect(r.start).toBe(1995);
            expect(r.end).toBe(2004);
            // both sides
            r.extend(utils.createRange(1900, 2010));
            expect(r.start).toBe(1900);
            expect(r.end).toBe(2010);
            // start with nothing, extend w/ nothing
            r = utils.createRange(null, null);
            r.extend(r = utils.createRange(null, null));
            expect(r.isEmpty()).toBe(true);
            // starting with nothing, extend open-ended start
            r = utils.createRange(null, null);
            r.extend(utils.createRange(1234, null));
            expect(r.start).toBe(1234);
            expect(r.end).toBe(1234);
            // starting with nothing, extend open-ended end
            r = utils.createRange(null, null);
            r.extend(utils.createRange(null, 5678));
            expect(r.start).toBe(5678);
            expect(r.end).toBe(5678);
        });
        it("intersects works with instants", function() {
            var r = utils.createRange(2000, 2003);
            expect(r.intersects(1999)).toBe(false);
            expect(r.intersects(2000)).toBe(true);
            expect(r.intersects(2001)).toBe(true);
            expect(r.intersects(2003)).toBe(false);
            // instant range, too
            r = utils.createRange(2000, 2000);
            expect(r.intersects(2000)).toBe(true);
        });
        it("intersects works on open range with instants", function() {
            var r = utils.createRange(null, 2003);
            expect(r.intersects(1999)).toBe(true);
            expect(r.intersects(2004)).toBe(false);
            r = utils.createRange(2003, null);
            expect(r.intersects(1999)).toBe(false);
            expect(r.intersects(2004)).toBe(true);
        });
        it("intersects works on instant range with open ranges", function() {
            var r = utils.createRange(2003, 2003);
            expect(r.intersects(utils.createRange(1999, null))).toBe(true);
            expect(r.intersects(utils.createRange(null, 2004))).toBe(true);
            expect(r.intersects(utils.createRange(2004, null))).toBe(false);
            expect(r.intersects(utils.createRange(null, 2002))).toBe(false);
        });
        it("intersects works with extents", function() {
            var r = utils.createRange(2000, 2003);
            expect(r.intersects(utils.createRange(1999, 2000))).toBe(true);
            expect(r.intersects(utils.createRange(2000, 2001))).toBe(true);
            expect(r.intersects(utils.createRange(2002, 2003))).toBe(true);
            expect(r.intersects(utils.createRange(1999, 2003))).toBe(true);
            expect(r.intersects(utils.createRange(1999, 2004))).toBe(true);
            expect(r.intersects(utils.createRange(2004, 2005))).toBe(false);
            expect(r.intersects(utils.createRange(1998, 1999))).toBe(false);
        });
        it("isRangeLike works", function() {
            expect(utils.isRangeLike(null)).toBe(false);
            expect(utils.isRangeLike(undefined)).toBe(false);
            expect(utils.isRangeLike('x')).toBe(false);
            expect(utils.isRangeLike(22)).toBe(false);
            expect(utils.isRangeLike({start:1})).toBe(true);
            expect(utils.isRangeLike({end:1})).toBe(true);
            expect(utils.isRangeLike({start:1, end:1})).toBe(true);
        });
    });
    it("tests interval picking", function() {
        expect(utils.pickInterval(utils.createRange('2000','2001'))).toBe(
            moment.duration(1, 'months').asMilliseconds()
        );
        expect(utils.pickInterval(utils.createRange('2000-01-01','2000-02-01'))).toBe(
            moment.duration(1, 'weeks').asMilliseconds()
        );
    });
    it("tests compute range works", function() {
        var r = utils.computeRange([utils.createRange(100,200)]);
        expect(r.start).toBe(100);
        expect(r.end).toBe(200);
        r = utils.computeRange([utils.createRange(100,400), utils.createRange(100,300)]);
        expect(r.start).toBe(100);
        expect(r.end).toBe(400);
        r = utils.computeRange([20,10,50]);
        expect(r.start).toBe(10);
        expect(r.end).toBe(50);
    });
    it("tests createOffsetter works", function() {
        function offsetAsISO(timestamp, duration) {
            return new Date(utils.createOffsetter(duration)(timestamp)).toISOString();
        }
        expect(offsetAsISO('1970', 'P1Y')).toBe('1971-01-01T00:00:00.000Z');
        expect(offsetAsISO('1970-06-01', 'P1Y1M')).toBe('1971-07-01T00:00:00.000Z');
        expect(offsetAsISO('1974-02-28T12:24', 'P2Y2M')).toBe('1976-04-28T12:24:00.000Z');
        expect(offsetAsISO('1974-02-28T12:24', 'P2Y2M')).toBe('1976-04-28T12:24:00.000Z');
        // verify current algorithm fails - jan 31st + 1month wraps into march
        expect(offsetAsISO('1974-01-31T12:24', 'P2Y1M')).toBe('1976-03-02T12:24:00.000Z');
    });
        it("parseISODuration should throw sometimes", function() {
        expect(function() {
            utils.parseISODuration('TP1M');
        }).toThrowError('expected P as starting duration : TP1M');
        expect(function() {
            utils.parseISODuration('P1X');
        }).toThrowError('unknown duration specifier : X');
    });
    it("parseISODuration should parse correctly", function() {
        expect(utils.parseISODuration('PT1S')).toBe(1000);
        expect(utils.parseISODuration('PT1M')).toBe(60000);
        expect(utils.parseISODuration('PT1H')).toBe(3600000);
        expect(utils.parseISODuration('P1D')).toBe(86400000);
        expect(utils.parseISODuration('P1W')).toBe(604800000);
        expect(utils.parseISODuration('P1M')).toBe(2592000000);
        expect(utils.parseISODuration('P1Y')).toBe(31536000000);
        expect(utils.parseISODuration('P1MT1M')).toBe(2592000000 + 60000);
    });
});
