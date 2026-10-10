# Van hanh cac tinh nang nen

Tai lieu nay bo sung cac buoc bao mat va van hanh chung cho boilerplate. Gia tri secret
chi duoc truyen qua secret manager hoac environment tam thoi, khong commit vao repository.

## Tao quan tri vien dau tien

Chay sau khi database migrations hoan tat:

```sh
npm run bootstrap:admin:dev
```

Tren production, sau khi stack da chay migration:

```sh
docker compose --env-file .env.prod -f docker-compose.prod.yml exec \
  -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD \
  -e BOOTSTRAP_ADMIN_FIRST_NAME -e BOOTSTRAP_ADMIN_LAST_NAME api \
  node dist/database/seeds/bootstrap-admin.js
```

Inject bon bien `BOOTSTRAP_ADMIN_*` vao moi truong cua lenh tu secret manager. Khong luu
mat khau trong shell history hoac `.env.prod`; xoa gia tri tam sau khi chay. Script dung
neu da co Admin va tranh tao dong thoi bang PostgreSQL advisory lock.

## Two-factor authentication

TOTP mac dinh tat. De bat, dat `ENABLE_TWO_FACTOR=true` va tao khoa AES-256 32 byte:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Dat ket qua vao `TWO_FACTOR_ENCRYPTION_KEY` (64 ky tu hex). Secret TOTP duoc ma hoa AES-256-GCM
trong database; API chi tra secret/QR trong buoc setup. Backup khoa ben canh quy trinh backup
database. Khong rotate truc tiep: can giai ma va ma hoa lai tat ca secret bang ca khoa cu va
khoa moi, hoac reset 2FA cho nguoi dung theo quy trinh da thong bao.

Dang nhap local va Google deu yeu cau ma TOTP khi tai khoan da bat 2FA. Ma chi duoc chap nhan
mot lan trong mot chu ky. Tat 2FA can mat khau hien tai va ma TOTP.

## Audit retention

`AUDIT_RETENTION_DAYS=0` (mac dinh) khong tu dong xoa audit. Dat so ngay duong theo chinh sach
luu tru va nghia vu tuan thu cua tung du an. Qua trinh don chay hang ngay, xoa theo cac lo toi
da 100.000 dong moi lan; can theo doi log cleanup va dung luong PostgreSQL. Khong bat retention
neu chua co chinh sach backup/luu tru phu hop.

Audit metadata chi nen chua ma dinh danh va gia tri khong nhay cam. Cac key co ten lien quan
den password, token, secret, email, phone, address, request body, query va cookie bi tu choi;
metadata gioi han 20 truong, key toi da 64 ky tu va string value toi da 512 ky tu. Khong ghi
thong tin ca nhan vao action/resource fields.

## Domain modules

Domain modules chi duoc nap vao Nest runtime khi feature flag tuong ung bang `true`. Schema va
migrations van ton tai de du an fork co the bat lai module. Flash Cards can Topics module cho
entity relation, nhung API Topics van theo `ENABLE_TOPICS` rieng. Tat flag khong xoa bang hoac
du lieu da co.

## Migration email

Migration tao unique index khong phan biet chu hoa thuong tren email va chuan hoa du lieu ve
lowercase. Migration dung truoc khi cap nhat neu co email trung nhau sau khi lowercase. Sao luu
database, giai quyet cac tai khoan trung thu cong, sau do chay migration lai.
