import Reporter from "../DB/models/ReportersModel.js";

export const generateReporterId = async () => {
    let newId;
    let existingReporter;

    // Get the latest reporter ID from the database
    const latestReporter = await Reporter.findOne().sort({ createdAt: -1 }).exec();

    if (latestReporter && latestReporter.reporterId) {
        // Extract the letter prefix and numeric part from the latest reporter ID
        const latestId = latestReporter.reporterId.slice(4); // Remove 'REP-' prefix
        const prefix = latestId[0]; // First character (A, B, etc.)
        const number = parseInt(latestId.slice(1), 10); // Numeric part (01001, etc.)

        // Increment the numeric part
        if (number < 99999) {
            const newNumber = String(number + 1).padStart(5, '0'); // Ensure it's 5 digits
            newId = `REP-${prefix}${newNumber}`;
        } else {
            // Move to the next letter prefix
            const newPrefix = String.fromCharCode(prefix.charCodeAt(0) + 1); // Increment character
            newId = `REP-${newPrefix}01001`;
        }
    } else {
        // Start from the first ID if no reporters exist
        newId = 'REP-A01001';
    }

    // Ensure the generated ID is unique
    do {
        existingReporter = await Reporter.findOne({ reporterId: newId }).exec();
        if (existingReporter) {
            // If the ID already exists, increment the numeric part or prefix again
            const prefix = newId.slice(4, 5); // Current letter prefix
            const number = parseInt(newId.slice(5), 10); // Numeric part

            if (number < 99999) {
                const newNumber = String(number + 1).padStart(5, '0');
                newId = `REP-${prefix}${newNumber}`;
            } else {
                const newPrefix = String.fromCharCode(prefix.charCodeAt(0) + 1);
                newId = `REP-${newPrefix}01001`;
            }
        }
    } while (existingReporter);

    return newId;
};
