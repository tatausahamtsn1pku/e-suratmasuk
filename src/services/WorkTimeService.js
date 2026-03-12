const { addDays, setHours, setMinutes, isWeekend } = require('date-fns');

class WorkTimeService {
    calculateOfficialTime(date) {
        let target = new Date(date);
        const hour = target.getHours();

        if (hour < 7 || hour >= 17 || isWeekend(target)) {
            if (hour >= 17) target = addDays(target, 1);
            target = setHours(setMinutes(target, 0), 7);
            while (isWeekend(target)) { target = addDays(target, 1); }
        }
        return target;
    }
}
module.exports = new WorkTimeService();