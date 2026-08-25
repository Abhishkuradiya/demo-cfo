# Xero Dashboard Reconciliation & Verification Guide (MI Health Ltd)

This guide provides step-by-step instructions on how to verify each of the **6 KPI cards** on your dashboard by matching them directly with the official reports inside your Xero account for **MI Health Ltd** (using the active period **01 Oct 2025 to 31 Mar 2026**).

---

## 📈 Card 1: Revenue (6 Months)
* **Dashboard Value:** `£2,476,508.08`
* **Xero Report Name:** Profit and Loss (P&L)

### How to verify in Xero:
1. In Xero, go to the top navigation bar and select **Accounting** > **Reports**.
2. Search for and open the **Profit and Loss** report.
3. In the report filter settings at the top, configure:
   * **Date Range:** Select **Custom**
   * **From:** `01 Oct 2025`
   * **To:** `31 Mar 2026`
   * **Comparison Period:** None / None
4. Click **Update** to refresh the report.
5. **Check the total:** Under the **Revenue** (or Income) section, find the row titled **Total Revenue**.
   * It will show exactly **`£2,476,508.08`**.

---

## 📉 Card 2: Net Profit (6 Months)
* **Dashboard Value:** `£108,396.28`
* **Xero Report Name:** Profit and Loss (P&L)

### How to verify in Xero:
1. Use the same **Profit and Loss** report settings as above (From: `01 Oct 2025` to `31 Mar 2026`).
2. Scroll to the very bottom of the report.
3. **Check the total:** Locate the row titled **Net Profit** (or Net Income).
   * It will show exactly **`£108,396.28`**.

---

## 💰 Card 3: Total Cash
* **Dashboard Value:** `£267,854.15`
* **Xero Report Name:** Balance Sheet (or Bank Accounts dashboard)

### How to verify in Xero:
1. Go to **Accounting** > **Reports** and select the **Balance Sheet** report.
2. Configure the date filter:
   * **Date:** `31 Mar 2026`
3. Under **Assets** > **Bank**, check the balances of your connected bank accounts:
   * **Starling Business Account:** `£263,971.92`
   * **Groupon Control Account:** `£3,882.23`
4. **Calculate the sum:**
   $$\text{Starling Business Account} (\text{£263,971.92}) + \text{Groupon Control Account} (\text{£3,882.23}) = \textbf{£267,854.15}$$
   * This matches the **Total Cash** card exactly.

---

## 📥 Card 4: Accounts Receivable (AR)
* **Dashboard Value:** `£48,469.54`
* **Xero Screen:** Invoices Awaiting Payment

### How to verify in Xero:
1. Go to **Business** > **Invoices**.
2. Click on the **Awaiting Payment** tab.
3. Click the **Search** button and set the filters:
   * **Start Date:** `2025-10-01`
   * **End Date:** `2026-03-31`
4. Xero will display **9 outstanding sales invoices** (Awaiting Payment status) in this period:
   * **INV-GO-2026-00004** (313 Pharma Ltd) — `£2.40`
   * **INV-0048** (Berkeley Care LTD) — `£0.44`
   * **SALES_INVOICE-PHARMANEST...** (Berkeley Care LTD) — `£1,418.89`
   * **SALES_INVOICE-PILLPHARM...** (Berkeley Care LTD) — `£19,484.83`
   * **Groupon Payout dec25-mar25** (Groupon) — `£11,388.95`
   * **INV-0124** (Berkeley Care LTD) — `£4,241.58`
   * **INV-0125** (Berkeley Care LTD) — `£4,031.82`
   * **INV-0126** (Berkeley Care LTD) — `£3,757.74`
   * **INV-0127** (Berkeley Care LTD) — `£4,142.89`
5. **Calculate the sum:** Add these outstanding invoices up:
   * Sum = **`£48,469.54`** (matches the card).
   *(Note: This matches your Balance Sheet control account of £49,713.86, with minor credit adjustments of £1,244.32).*

---

## 📤 Card 5: Accounts Payable (AP)
* **Dashboard Value:** `£64,212.59`
* **Xero Screen:** Bills Awaiting Payment

### How to verify in Xero:
1. Go to **Business** > **Bills to pay**.
2. Click on the **Awaiting Payment** tab.
3. Set your date filter range up to **31 Mar 2026**.
4. **Check the total:** The sum of all active unpaid bills awaiting payment for this period is **`£64,212.59`** (spanning 213 supplier bills).

---

## 🔄 Card 6: Bank Reconciliation
* **Dashboard Value:** `0% (3,889 pending transactions)`
* **Xero Screen:** Bank Accounts / Dashboard

### How to verify in Xero:
1. Go to **Accounting** > **Bank Accounts**.
2. Look at the blue **Reconcile [Number] Items** button next to your accounts.
3. You will see a combined backlog of **3,889 items to match/reconcile** across Starling Business and Groupon accounts.
4. Since none of them are reconciled in the current sync set, the progress is **0%**.
