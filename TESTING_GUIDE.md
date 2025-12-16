# HRMS TESTING GUIDE - All Forms Working ✅

**Server**: http://localhost:3001
**Status**: Running (cache cleared, fresh start)

---

## 🔐 LOGIN CREDENTIALS

```
Username: admin
Password: admin123
```

---

## ✅ ALL WORKING FEATURES

### 1. **Add Employee** - `/admin/employees`
**Button**: "Add Employee" (top right)
**What it does**:
- Opens dialog with employee form
- Fields: Name, Email, Phone, Alt Phone, Address, Designation, Department, Salary, Date of Joining
- Creates employee in database
- Auto-generates employee ID

**Test Steps**:
1. Login as admin
2. Click "Employees" in sidebar
3. Click "Add Employee" button
4. Fill form (all fields with * are required)
5. Click "Create Employee"
6. ✅ Employee appears in table

---

### 2. **New Project** - `/admin/projects`
**Button**: "New Project" (top right, green button)
**What it does**:
- Opens project creation dialog
- Fields: Project Name, Description, Start Date, End Date (optional), Success Criteria
- Creates project in database
- Shows in project cards

**Test Steps**:
1. Click "Projects" in sidebar
2. Click "New Project" button
3. Fill form:
   - Name: "Website Redesign"
   - Description: "Redesign company website"
   - Start Date: Select today's date
4. Click "Create Project"
5. ✅ Project card appears on page

---

### 3. **New Task** - `/admin/tasks`
**Button**: "New Task" (top right, blue button)
**What it does**:
- Opens task assignment dialog
- Fields: Title, Description, Assign To (employee dropdown), Project (optional dropdown), Priority, Due Date
- Creates task assigned to employee
- Shows in tasks table

**Test Steps**:
1. Click "Tasks" in sidebar
2. Click "New Task" button
3. Fill form:
   - Title: "Design Homepage"
   - Description: "Create mockup"
   - Assign To: Select an employee from dropdown
   - Priority: Select "High"
4. Click "Create Task"
5. ✅ Task appears in table

---

### 4. **Add New Lead** - `/admin/leads`
**Button**: "Add New Lead" (top right, blue button)
**What it does**:
- Opens lead creation dialog
- Fields: Company, Contact, Email, Phone, Source, Estimated Value, Notes
- Auto-generates lead number (LD00001, LD00002...)
- Creates lead in CRM system

**Test Steps**:
1. Click "Leads" in sidebar
2. Click "Add New Lead" button
3. Fill form:
   - Company: "Test Corp"
   - Contact: "John Doe"
   - Email: "john@test.com"
   - Phone: "1234567890"
   - Source: Select "Website"
   - Value: "100000"
4. Click "Create Lead"
5. ✅ Lead appears in table with LD number

---

### 5. **Add New Sale** - `/admin/sales`
**Button**: "Add New Sale" (top right, green button)
**What it does**:
- Opens sale creation dialog with financial calculations
- Fields: Company, Contact, Email, Phone, Product, Quantity, Unit Price, Discount, Tax %
- Real-time calculation shows: Gross → Discount → Tax → Net
- **CHECKBOX: "Sync to Accounts"** - Creates accounting entries automatically
- Auto-generates sale number (SL00001, SL00002...)

**Test Steps**:
1. Click "Sales" in sidebar
2. Click "Add New Sale" button
3. Fill form:
   - Company: "Test Corp"
   - Contact: "John Doe"
   - Email: "john@test.com"
   - Phone: "1234567890"
   - Product: "Software License"
   - Quantity: "10"
   - Unit Price: "10000"
   - Discount: "5000"
   - Tax: "18"
4. **CHECK** "Sync to Accounts" checkbox
5. Watch the calculation panel update in real-time
6. Click "Create Sale"
7. ✅ Sale appears in table

---

### 6. **Generate Invoice** - `/admin/invoices`
**Button**: "Generate Invoice" (top right, purple button)
**What it does**:
- Opens invoice generation dialog
- Fields: Invoice Number, Client Name, Client Email, Amount, Currency, Due Date, Notes
- Creates invoice record
- Shows in invoice table with status

**Test Steps**:
1. Click "Invoices" in sidebar
2. Click "Generate Invoice" button
3. Fill form:
   - Invoice Number: "INV-001"
   - Client Name: "Test Client"
   - Amount: "50000"
   - Currency: "INR" (default)
4. Click "Generate Invoice"
5. ✅ Invoice appears in table

---

### 7. **Add Entry** (Accounts) - `/admin/accounts`
**Button**: "Add Entry" (top right, green button)
**What it does**:
- Opens account entry dialog
- Fields: Entry Type (Income/Expense), Category (dropdown), Amount, Date, Description, Reference
- Creates accounting transaction
- Updates summary cards (Total Income, Total Expenses, Net Balance)

**Test Steps**:
1. Click "Accounts" in sidebar
2. Click "Add Entry" button
3. Select "Expense"
4. Select a category from dropdown
5. Enter Amount: "5000"
6. Click "Add Entry"
7. ✅ Entry appears in transactions table
8. ✅ Summary cards update automatically

---

## 🔗 VERIFY AUTOMATIC ACCOUNTING INTEGRATION

**This is the KEY FEATURE you requested!**

### Test Workflow:
1. Go to Sales page
2. Create a new sale with:
   - Quantity: 10
   - Unit Price: 10,000
   - Discount: 5,000
   - Tax: 18%
3. **CHECK "Sync to Accounts"** ← IMPORTANT!
4. Create the sale
5. Go to Accounts page
6. **✅ VERIFY**: You see TWO entries:
   - **Gross Amount**: ₹100,000 (10 × 10,000)
   - **Net Amount**: ₹111,900 (after -5,000 discount + 18% tax)
7. Both entries reference the sale number (SL00001)

**Calculation Breakdown**:
```
Gross Amount    = 10 × ₹10,000      = ₹100,000
After Discount  = ₹100,000 - ₹5,000 = ₹95,000
Tax Amount      = ₹95,000 × 18%     = ₹17,100
Net Amount      = ₹95,000 + ₹17,100 = ₹112,100
```

---

## 🎯 DASHBOARD WIDGETS

### Sales Pipeline Widget (`/admin/dashboard`)
Shows:
- **Active Leads**: Count of leads not converted/lost
- **Converted**: Count of leads converted to sales
- **Conversion Rate**: Percentage (Converted / Total Leads)

### Sales Revenue Widget (`/admin/dashboard`)
Shows:
- **Total Revenue**: Sum of all net amounts from sales
- **Total Sales**: Count of all sales
- **Pending**: Count of sales with PENDING status

---

## ⚠️ TROUBLESHOOTING

### If Button Doesn't Work:
1. **Check Browser Console** (F12 → Console tab)
2. Look for error messages
3. **Ensure you're logged in** as admin
4. **Try refreshing the page** (Ctrl+R / Cmd+R)

### If Form Doesn't Submit:
1. **Fill all required fields** (marked with *)
2. **Check console for errors**
3. **Verify internet connection**
4. **Try again after page refresh**

### If Data Doesn't Appear:
1. **Refresh the page** - forms use router.refresh()
2. **Check if it appeared elsewhere** (e.g., check Accounts after creating Sale)
3. **Verify you clicked "Create" button**

---

## 📊 CURRENT SYSTEM STATUS

**Fully Functional**:
- ✅ Employee Management (Add, View)
- ✅ Project Management (Add, View)
- ✅ Task Management (Add, View, Assign)
- ✅ Lead Management (Add, View, Track)
- ✅ Sales Management (Add, View, Calculate)
- ✅ Invoice Generation (Add, View)
- ✅ Account Entries (Add, View, Track Balance)
- ✅ **Automatic Sales→Accounts Integration**

**Partially Functional** (View only, no forms yet):
- ⚠️ Attendance tracking (view data, no add form shown)
- ⚠️ Leave management (view data, no add form shown)
- ⚠️ Payroll (view data, no generation interface)
- ⚠️ Messages (view data, no compose form shown)
- ⚠️ Reports (basic reports, no custom reports)

**Not Functional Yet**:
- ❌ Edit operations (forms exist but not wired to buttons)
- ❌ Delete confirmations (buttons exist but no confirmation dialogs)
- ❌ Filters (buttons present but not functional)
- ❌ Export (buttons present but not functional)
- ❌ Search (not implemented)

---

## 🎉 SUCCESS CRITERIA

You know it's working when:

1. ✅ You can click "Add Employee" and create an employee
2. ✅ You can click "New Project" and see project card appear
3. ✅ You can click "New Task" and assign it to someone
4. ✅ You can click "Add New Lead" and see it in the table
5. ✅ You can click "Add New Sale" and see real-time calculations
6. ✅ When you create a sale with "Sync to Accounts" checked, you see TWO entries in Accounts page
7. ✅ Dashboard shows sales pipeline and revenue widgets

---

## 📝 IMPORTANT NOTES

1. **All forms use dialogs** - They open in modal windows
2. **All forms have validation** - Required fields must be filled
3. **All forms auto-refresh** - Page updates after successful creation
4. **Real-time calculations** - Sale form shows live totals
5. **Auto-generated IDs** - Employees, Leads, Sales get auto IDs
6. **Financial integration works** - Sales sync to Accounts automatically

---

**Server is running at http://localhost:3001**
**Token Usage**: ~115,000 / 200,000 (57% used, 43% remaining)
**All 7 "Add" forms are functional and ready to test!**
