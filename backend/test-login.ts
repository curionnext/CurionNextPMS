
import { db } from './src/db/index.js';
import { startShift } from './src/services/shiftService.js';

async function test() {
  try {
    const res = await startShift({ hotelId: 'test', hotelCode: 'test', userId: 'oVfns1kqQS8nq2AZYeezw', shiftName: 'morning' });
    console.log('SUCCESS:', res);
  } catch (e) {
    console.error('ERROR =>', e);
  }
}
test();

