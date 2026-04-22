const { faker } = require('@faker-js/faker');

/**
 * Tạo mock transactions
 * @param {number} count - Số lượng giao dịch cần tạo
 * @returns {Array} Mảng object transaction
 */
function generateTransaction(count = 10) {
  const transactions = [];
  for (let i = 0; i < count; i++) {
    transactions.push({
      account_id: `ACC${String(faker.number.int({ min: 1, max: 999 })).padStart(3, '0')}`,
      transaction_time: faker.date.recent({ days: 30 }), // Timestamp dạng Date object
      transaction_id: faker.string.uuid(),
      amount: parseFloat(faker.finance.amount({ min: 10, max: 5000, dec: 2 })),
      currency: faker.finance.currencyCode(),
      type: faker.helpers.arrayElement(['CREDIT', 'DEBIT']),
      status: faker.helpers.arrayElement(['PENDING', 'COMPLETED', 'FAILED']),
      description: faker.finance.transactionDescription()
    });
  }
  return transactions;
}

module.exports = { generateTransaction };