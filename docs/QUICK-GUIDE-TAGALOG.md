# S3 Browser - Mabilis na Gabay (Tagalog)

## Ano ang Temp Bucket?

### Bakit may `palawanpay-s3browser-temp` bucket?

Kapag nag-download ka ng **maraming files** (bulk download):

**Problema dati:**
- Ginagawa ng system: ZIP file → ilalagay sa iyong bucket → may `temp/` folder na lumalabas
- Kalat sa bucket mo ❌
- Manual delete pa ❌

**Solusyon ngayon:**
- Ginagawa ng system: ZIP file → ilalagay sa separate temp bucket
- Walang kalat sa iyong buckets ✅
- Auto-delete after 1 day ✅
- Organized by user email ✅

### Paano gumagana?

1. Pipiliin mo ng maraming files
2. Click "Download" button
3. System:
   - Kukunin lahat ng files from S3
   - I-combine into one ZIP file
   - I-store sa temp bucket: `palawanpay-s3browser-temp/{your-email}/{timestamp}.zip`
   - Bibigyan ka ng download link
4. I-download mo yung ZIP file
5. After 1 day: Auto-delete na yung ZIP file

### Halimbawa

```
palawanpay-s3browser-temp/
├── wilben.s@palawanpay.com/
│   ├── 20260306_140530.zip  (auto-delete after 1 day)
│   └── 20260306_153245.zip  (auto-delete after 1 day)
└── juan.delacruz@palawanpay.com/
    └── 20260306_141200.zip  (auto-delete after 1 day)
```

## Audit Logs

### Ano ang nilo-log?

Lahat ng ginagawa mo sa S3 Browser:
- Upload ng file
- Delete ng file
- Copy/Move ng file
- Download ng file
- Create ng folder

### Saan nakalagay ang logs?

**Bucket**: `palawanpay-s3browser-audit-logs`

**Format**: `YYYY/MM/DD/HH00-audit.jsonl`
- Isang file per hour
- Lahat ng events sa loob ng hour na yun

**Halimbawa**:
```
2026/03/06/1400-audit.jsonl  ← lahat ng events from 2:00 PM - 2:59 PM
2026/03/06/1500-audit.jsonl  ← lahat ng events from 3:00 PM - 3:59 PM
```

### Ano ang laman ng log?

```json
{
  "timestamp": "2026-03-06T14:23:45.123456",
  "event_type": "UPLOAD",
  "user_email": "wilben.s@palawanpay.com",
  "bucket": "test-bucket-s3-browser-pfsc",
  "key": "documents/report.pdf",
  "details": {
    "size": 12345,
    "type": "application/pdf"
  }
}
```

### Paano tingnan ang logs?

**Via AWS Console**:
1. Pumunta sa S3 Console
2. Buksan ang `palawanpay-s3browser-audit-logs` bucket
3. Navigate sa date folder (e.g., `2026/03/06/`)
4. Download yung hour file na kailangan mo

**Via AWS CLI**:
```bash
# List lahat ng logs
aws s3 ls s3://palawanpay-s3browser-audit-logs/ --recursive

# Download specific hour
aws s3 cp s3://palawanpay-s3browser-audit-logs/2026/03/06/1400-audit.jsonl .
```

## Mga Tanong

### Q: Bakit kailangan ng separate temp bucket?
**A**: Para hindi magulo yung iyong buckets. Dati may lumalabas na `temp/` folder sa bucket mo. Ngayon, separate na.

### Q: Paano kung gusto kong i-delete agad yung temp files?
**A**: Auto-delete na after 1 day. Hindi mo na kailangan i-manual delete.

### Q: Makikita ko ba yung temp bucket sa S3 Browser?
**A**: Hindi. Hidden yun. Para sa system use lang.

### Q: Paano kung hindi ko makita yung audit logs?
**A**: Logs lang yung operations na ginawa through S3 Browser app. Hindi kasama yung direct S3 operations.

### Q: Pwede bang i-download lahat ng logs?
**A**: Oo! Download mo lang yung buong bucket or specific date/hour files.

## Support

May tanong? Contact:
- IT Support
- Team Lead
- DevOps Team
