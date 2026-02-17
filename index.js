exports.handler = async () => {

    try {
        console.log("Fetching employee data...");

        const employeeResponse = await fetch(
            "https://dummy.restapiexample.com/api/v1/employees"
        );

        const employeeJson = await employeeResponse.json();
        const employees = employeeJson.data;

        console.log(`Total Employees Retrieved: ${employees.length}`);

        const token = await getAAToken();

        let high = 0;
        let normal = 0;
        let low = 0;

        for (const emp of employees) {

            const priority = determinePriority(emp.employee_salary);

            if (priority === "HIGH") high++;
            else if (priority === "MEDIUM") normal++;
            else low++;

            await addToQueue(emp, priority, token);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Employees added to Automation Anywhere Queue",
                total: employees.length,
                high,
                normal,
                low
            })
        };

    } catch (error) {

        console.error("Error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function determinePriority(salary) {

    const numericSalary = parseInt(salary);

    if (numericSalary > 300000) return "HIGH";
    if (numericSalary >= 100000) return "MEDIUM";
    return "LOW";
}

async function getAAToken() {

    const response = await fetch(
        `${process.env.AA_BASE_URL}/v2/authentication`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: process.env.AA_USERNAME,
                password: process.env.AA_PASSWORD
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AA Authentication Failed: ${errorText}`);
    }

    const data = await response.json();
    return data.token;
}

async function addToQueue(token, employee) {
    const response = await fetch(
        `${process.env.AA_BASE_URL}/v2/repository/workitems`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                queueName: "New Hires",
                data: {
                    EmployeeID: employee.id,
                    FirstName: employee.firstName,
                    LastName: employee.lastName,
                    Email: employee.email
                }
            })
        }
    );

    const responseText = await response.text(); // define FIRST

    if (!response.ok) {
        console.error("Queue API Error:", responseText);
        throw new Error(`Queue Insert Failed: ${responseText}`);
    }

    return JSON.parse(responseText);
}
