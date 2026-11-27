# PubMed Agent

מוריד אוטומטית מטא-דאטה וקבצי PDF פתוחים (Open Access) מ-PubMed, לפי רשימת PMID.

## התקנה

```bash
npm install
```

צרו קובץ `.env` (לפי `.env.example`):

```
NCBI_API_KEY=your_ncbi_api_key_here
CONTACT_EMAIL=you@example.com
```

- `NCBI_API_KEY` מגדיל את קצב הבקשות המותר מול NCBI (לא חובה, אך מומלץ).
- `CONTACT_EMAIL` נדרש גם על ידי NCBI וגם על ידי Unpaywall.

מלאו את `pmids.txt` — שורה לכל PMID, כמספר בלבד או כקישור מלא ל-PubMed.

## הרצה

```bash
npm start
```

התוצאות:
- `downloads/{PMID}.pdf` — קבצי PDF פתוחים שהצליחו לרדת.
- `results.csv` — טבלת סיכום (UTF-8 עם BOM, נפתחת תקין ב-Excel) עם כל השדות שחולצו וסטטוס ההורדה לכל PMID.

הרצות חוזרות מדלגות על PDF-ים שכבר ירדו.
