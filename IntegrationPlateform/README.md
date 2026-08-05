# 🚀 Accounting Integration Platform - Laravel Backend

Hello! Is guide/README me humne poore platform ki architecture, design, aur working ko bohot hi simple Hinglish aur English me explain kiya hai taaki aapko 100% clear ho jaye ki humne kya banaya hai aur ye kaise kaam karta hai.

---

## 📌 Humne Ye Platform Kyun Banaya? (What & Why?)

Aapka long-term goal hai ek **Common Integration System** banana, jo different accounting tools (Xero, QuickBooks, Zoho) se connect ho sake.

### 🚫 Pehle Kya Tha? (The Direct Problem)
Power BI directly Xero ke API se baat kar raha tha. Isse 3 bade problems the:
1. **Rate Limits**: Xero request limit cross hone par connection block kar deta hai.
2. **Speed**: Real-time me Xero se data pull karna bohot slow hota hai, jisse Power BI report refresh hone me bohot time leti hai.
3. **Vendor Lock-in**: Agar kal ko QuickBooks integrate karna ho, toh Power BI connector me naya code likhna padta.

### ✅ Ab Kya Hai? (The Solution: Our Platform)
Humne ek middle layer backend (Laravel Integration Platform) banaya hai.
```
Power BI / CRM / Mobile App
       │ (Calls Local REST API)
       ▼
 ┌───────────┐
 │  Laravel  │ <───> [ MySQL Database (Stored Copy) ]
 └─────┬─────┘
       │ (Background Jobs sync data in background)
       ▼
 ┌───────────┐
 │   Xero    │ (Original source of data)
 └───────────┘
```
**Benefits**:
1. **Super Fast**: Power BI humare local MySQL DB se directly aur instantly data read karega.
2. **Multi-Tenant**: Ek hi platform se alag-alag companies (tenants) ka data manage hoga.
3. **Pluggable**: Future me QuickBooks ya Zoho integrate karne ke liye Power BI connector me **zero change** karna hoga. Bas Laravel me unka provider code likhna hoga.

---

## 📂 Project Structure & Folders (Kahan kya hai?)

Humne code ko fully modular rakha hai taaki SOLID principles follow ho sakein:

*   **`app/Integrations/Contracts/AccountingProvider.php`**:
    *   Ye ek interface (rule book) hai. Har naye provider (Xero, QuickBooks, Zoho) ko isi format ke methods (e.g., `getCustomers()`, `getInvoices()`) implement karne honge.
*   **`app/Integrations/Providers/XeroProvider.php`**:
    *   Xero ke REST API se communicate karne ka saara code isi ke andar hai.
*   **`app/Integrations/Mappers/`**:
    *   Xero se mila raw data alag format me hota hai. Mappers ka kaam us data ko humare standard format me badalna hai (e.g. converting Xero's Microsoft JSON dates `/Date(1620345600000)/` to `YYYY-MM-DD`).
*   **`app/Integrations/DTOs/`**:
    *   Data Transfer Objects. Standard containers hain jo data flow ko clean aur predictable rakhte hain.
*   **`app/Integrations/OAuth/OAuthManager.php`**:
    *   Xero ke tokens ko check karna, expired tokens ko refresh token ke zariye automatically refresh karna aur naye tokens ko DB me securely (encrypted format me) update karna iska kaam hai.
*   **`app/Repositories/`**:
    *   Database transactions ko controllers se alag rakhne ke liye Repository pattern ka use kiya hai.
*   **`app/Integrations/Services/SyncService.php`**:
    *   Ye service poore sync process ko system-wide sequentially run karti hai (first Contacts/Accounts, then Invoices, then Payments) taaki MySQL database relations database constraints se crash na hon.
*   **`app/Jobs/SyncProviderDataJob.php`**:
    *   Queue Job jo background me sync run karti hai taaki server response block na ho.

---

## 🛠️ Step-by-Step Working Flow (Ye chalega kaise?)

### 1. Connection & Authorization (OAuth Handshake)
*   **User Action**: Tenant/Admin browser me is url ko open karega:
    `http://localhost:8000/oauth/xero/redirect?tenant_id=1`
*   **Backend Magic**: Server ek unique `state` generate karke cache me save karega, aur browser ko Xero Login page par redirect karega.
*   **Xero Consent**: User login karke "Allow Access" karega.
*   **Callback Handled**: Xero user ko wapas humare callback route `/oauth/xero/callback` par bhejega. Hum state verify karenge, auth code ko tokens me badlenge, aur use securely **MySQL database** me encrypt karke save kar denge.

### 2. Data Synchronization (Syncing Xero to Local DB)
*   **Manual Trigger**: Aap is command se sync trigger kar sakte hain:
    ```bash
    php artisan sync:tenant 1
    ```
*   **Scheduled Trigger**: Platform me check auto-run hota hai. Har ghante (hourly scheduler) auto-detect karke background queue me sync job chala deta hai.
*   **Auto Token Refresh**: Jab bhi sync start hota hai, `OAuthManager` check karta hai token expired hai ya nahi. Agar expired hai, toh background me bina user ko bataye naya token refresh ho jata hai.

### 3. Reporting and Querying (Power BI & CRM Consumption)
*   Aapke consumer client apps (jaise Power BI Custom Connector, CRM, ya Mobile application) ab database se directly REST APIs ke zariye data query karenge.
*   Sabhi endpoints ke liye **`X-Tenant-ID`** header bhejna compulsory hai, taaki multi-tenant data leak na ho.

---

## 📡 REST API Endpoints (Power BI kahan connect hoga?)

Aapko client side (jaise `.pq` or `.mez` connector ya CRM) me in endpoints par requests bhejni hain:

| HTTP Method | API Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/customers` | Tenant ke saare Customers returns karega |
| **GET** | `/api/invoices` | Tenant ke saare Invoices returns karega |
| **GET** | `/api/payments` | Tenant ke saare Payments returns karega |
| **GET** | `/api/accounts` | Chart of Accounts return karega |
| **GET** | `/api/reports/profit-loss` | Standard Profit & Loss report (cached) |

*Note: In sabhi API calls me header add karein: `X-Tenant-ID: 1`*

---

## ⚙️ Development me ise start kaise rakhein?

Apne local PC par development chalu rakhne ke liye ye teen cheezein running honi chahiye:

1. **MySQL Database**: Apne XAMPP console se MySQL server start rakhein.
2. **Web Server**: 
   ```bash
   C:\xampp-new\php\php.exe artisan serve --port=8000
   ```
3. **Queue Worker** (Background jobs run karne ke liye):
   ```bash
   C:\xampp-new\php\php.exe artisan queue:work
   ```
4. **Scheduler** (Periodic hourly sync test karne ke liye):
   ```bash
   C:\xampp-new\php\php.exe artisan schedule:work
   ```
