# Evidence manifests R1

Generated: 2026-07-10
Source Revision: `9d2b6e9d36d6a8e66fbfcc7fb79724f474b4296c`

## Алгоритм

Кожний content manifest є ordinal-sorted списком рядків exact format `UPPERCASE_SHA256␠␠forward/slash/path`. Aggregate digest обчислюється як SHA-256 від UTF-8 без BOM bytes усіх рядків, з'єднаних одним LF (`0A`) і завершених одним LF. CRLF не використовується у digest input.

Candidate manifest охоплює exact modified/untracked audited candidate за `git status --porcelain=v1`, розгортає untracked directories до files і виключає лише `memory/tasks/plan/TASK-07.26-0019-bp2-05-phase-2-stabilization/**`, щоб уникнути самореференції evidence/result. Цей task-local package перевіряється окремо як author/review record; production code, accepted BP2-02…04 artifacts і general canonical memory покриті manifest.

PowerShell algorithm для aggregate digest:

```powershell
$text = ($lines -join "`n") + "`n"
$bytes = [Text.Encoding]::UTF8.GetBytes($text)
$sha = [Security.Cryptography.SHA256]::Create()
([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '')
```

## Exact sorted git status

```text
 M memory/domain/current/implementation-state.md
 M memory/product/roadmap.md
 M memory/state.md
 M memory/tasks/plan/progress.md
 M memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/index.md
 M memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/task.md
 M memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/index.md
 M memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/task.md
 M memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/index.md
 M memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/task.md
 M memory/tasks/plan/TASK-07.26-0019-bp2-05-phase-2-stabilization/index.md
 M memory/tasks/plan/TASK-07.26-0019-bp2-05-phase-2-stabilization/task.md
 M memory/technical/architecture.md
 M memory/technical/index.md
 M memory/technical/public-read-contract.md
 M memory/technical/stack.md
 M scripts/package-smoke.mjs
 M src/index.test.ts
 M src/index.ts
 M src/runtime/lifecycle.test.ts
 M src/runtime/lifecycle.ts
?? memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/
?? memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/
?? memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/
?? memory/tasks/plan/TASK-07.26-0019-bp2-05-phase-2-stabilization/runs/
?? src/core/
?? src/public/
?? src/runtime/facades.test.ts
?? src/runtime/facades.ts
?? src/system-extensions/default-api/facades.ts
```

## Audited candidate content manifest

Count: 43
Aggregate SHA-256: `FCDF5D286CCDBD480901ACB3BF88DF3C2DDFADB56094FF581A59D7D17CD951F9`

```text
E92F0D03F37BB9151C12C09AE2038F03C7795DF736C04E436CB6A23CF7FB3BD4  memory/domain/current/implementation-state.md
FFBDE56090A91EE2038DBC2D8A7C5D523C92C919D1263F82659BB9715952BC6A  memory/product/roadmap.md
1B90ADBC001F568B16A8E23C4359C98A8B818A312F82C853AAA0D381E478DBD2  memory/state.md
131666B4497CFB01108C319AB989AB3CC0604E115730DB8EA18F4D9D25AD075A  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/index.md
AAFF8FD2AD171142D2AC041F4DC3E72848B827271DC9DA54945E293DD83798CE  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/RUN-001/context.md
473E372F5B9B53E7A96F14BDB498F3E59B06505EC9D49F99D24F0B9766496528  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/RUN-001/index.md
EC6C94FE1B62458086C2D21E02B004859145EE18F39CE3ACE844AC782F533CFD  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/RUN-001/requirements.md
CF475E14B24EAE158A742F011AA240854B2D6E72C7A28FD259DA178090DA0D1D  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/RUN-001/result.md
232F8AEBD9FA046759AB8617A59C241936244D7B137331D0F0AF57D3FC348F55  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/index.md
5687F01DB3AB1D59994449F420C87BCA7B2E1710D78170D4F55B18E97C59970D  memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/task.md
1B7021A9A2393AAE32E0D9AF8D930931700BE41551E97798368E0D20298A42E2  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/index.md
309E984D2CC8EFFF81223003B44C04EC832611C1D83FCD7D866C96C05A6EB083  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/RUN-001/context.md
4B1E64131A80C7686683F5B4B9607D3DF328FA59D6726697C1748F7F05C64D3B  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/RUN-001/index.md
644592BD18A24E507F71D1E34301F42A5D858C668BCA42DDBE094943F66A4482  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/RUN-001/requirements.md
5540E0631E83DDBCC8AF4A49332954CC79F8CB8633ECBC7045DA804DBC63632C  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/RUN-001/result.md
57B8DCBBD7A69B3D4A84B1BDF388A8269CA220DDC01A65BFCAD5661CF00C8138  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/index.md
5D1F0B51E35F37E5F82D2D55BCFE68C29DD2BFBE35CDFA598F70793E79A0B699  memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/task.md
DEE8C364FDE9B93AD10631094A0B27B8DDC2EA3B35D25BCFB7632282014529E2  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/index.md
EA140AD346A1B5783E24B4B5B9F1330EAE58364F497DF492F929F63F92EA723A  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/RUN-001/context.md
1F59510260FE94B448F4F4BA08449A21FE04CD40E34171D8BD70066157CB397D  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/RUN-001/index.md
09BD9993DB970294A1412A92C36D53E9F4212EB9612C4E6F4D09D52EACC46B10  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/RUN-001/requirements.md
040379CD015B96D20C9C300B399B3D1DCC9DD5EA23C18B187E748182F436A69B  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/RUN-001/result.md
F2C3F3323D72823CE85CCB3BF90174404B23C137A6BE8762118271271CB3FD02  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/index.md
7ACA6BD9B412350DEADDCDA2C974C7763392C1E5C48331EE9CF248EA91E8C2C6  memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/task.md
9FF98EA62077B286C81A05D53F1B8266F5C4BC6BD4BAB4D97095501481BB56C4  memory/tasks/plan/progress.md
2503C91E15ABB8FEB4361D86A57006A5426B4FE249EA9085EC25DF12FAF23054  memory/technical/architecture.md
D06B473D107A7228BF3A6124F64CE3D34505314E52B834951D780E61F56BE9C0  memory/technical/index.md
793DB45EF84CD3A91908FB42DA928252C4A40DCAEAB1C95E91A15A080224E26C  memory/technical/public-read-contract.md
CA2401188C2073E3BFBF8E1B7E3F8A0E53D5AEB23702A985953005DAC7A798E2  memory/technical/stack.md
25806B39402314FA61367376922DF844C2BE81FBC903CAA476F1E078ADB22C37  scripts/package-smoke.mjs
10D710B08DE6CB794E23511F77923AD66A570299D8806496043E4E9966AA2292  src/core/resource-index.ts
7226A15467B68D3F4F025803AB50154338B4630A25324AD678D7F7E608410BFF  src/core/resource-read-runtime.test.ts
2B028DBB462E3EB86C2BB1D7A1FE45774CDB18DEF830583E2F033DB8174AE630  src/core/resource-read-runtime.ts
48FDFC9A7AFEB0E832B09F043DF01C929C57FE678A4DE16A196C52B4C7BEEA9B  src/index.test.ts
DD5DA364FDF43933E91ED1471B910852E7DBDF690EC08ED8084E0045D86ADCE1  src/index.ts
107C2530A16C90A777D6702924D43E46E7F30F15AC9B75E7483736A8819DCC9B  src/public/contracts.ts
11D04E67FD7AC99276F0A4A0E7C6149C67EDE34FF42851361D0D4B11E20AD8E7  src/public/extensia.test.ts
2901C061570E522F337DFF927F765372F5303F853311EAE8B09D5355C645CE12  src/public/extensia.ts
22B00B9E57F9AB7985A3DFC7446B02EBC8549625D4472C41DAB3C635E066B1E3  src/runtime/facades.test.ts
E954C0EF67CB20039E5C2D038CB3180DB98EC0B4179094EE1491D7A1C52BF8BE  src/runtime/facades.ts
567D5D2537BD9456D74760F0199ECEDBD18759838BAFF31A9C8007DFAA8717A3  src/runtime/lifecycle.test.ts
E1AAB214E61AB2A962D0194B8679832F32D798966CB173E67B15DF1CD1BD8563  src/runtime/lifecycle.ts
05AC93E527509099EA9C8EA43DBE96F494311E2A668316690FCB92272776411B  src/system-extensions/default-api/facades.ts
```

## Controlled dist manifest

Count: 64
Aggregate SHA-256: `E7FB3A49A390F32D18FF34783B903C9CFF7DF4F28CAE662EB27D7128C2F8FA08`

```text
87754C64576FB7AB3EEA1A319A52BF3AB760718A5EF2446E2672219AA5FCF04C  composition/diagnostics.d.ts
F68EF1FD95480DE9E943314BB2587B1C871CF235437426E27630A8859C8447F1  composition/diagnostics.d.ts.map
AE5423530CDA674B738D9666C1D2EF1F7657CF2510645CB43D7F748592D5C8CA  composition/diagnostics.js
98228EF2487C02C06C48ADE83BA918749D8922FE90D8495116EAF5D2C2F37444  composition/diagnostics.js.map
B623A8021DF90FEB2486F761E309781CE97624E625F451B81D26AF9539A00A36  composition/inspection.d.ts
DFC3D83075322CB92D91C0796E13C292CB55A98940BB6D413F46863A8FB22097  composition/inspection.d.ts.map
9EAF434ED1DA5BD20F2D0385F67881F018A09D7E9A3DB8023CA3D6FA24C3FEBA  composition/inspection.js
EECA6B05EB82545BBDA228F1D164B2ABD19804BC755428F47891F33BC0BA675B  composition/inspection.js.map
67A745EB4D9368768A62D3302C3A38B829D2AAC280A30F9637260451FECC087E  composition/root.d.ts
8EA9D38C88BFFD51DFA607B6E6676AC752A8D9AFA25DD6CA0E8A815E9EC3913A  composition/root.d.ts.map
8EEC67101C314370FF892607184703F188BF931CBEB427F7770DEAC21C164B6B  composition/root.js
227ABBE3885256699B7D0A1837A33EAF7864D3E0DE8D4CDEA5B66FC463A999BA  composition/root.js.map
2B55EB25B9C4715EE9D225B942FCE4FD488570BCCA99608B3C78BADD880DDA2A  composition/tokens.d.ts
658C194C04A44A387F115BEC54DC4E67D3934C929FA752C8435928832B593F38  composition/tokens.d.ts.map
ADD51D37835B51D13F9C46C5FCB328D14B5885C89DBFD5CEF6F27829202AD32A  composition/tokens.js
3F61ADA43E1B8206551C1797F733A583CF87747745EEDD6E177A5217810DC6B9  composition/tokens.js.map
F060B39F487D44B8A0636D2EC33C3FD30D648EF03A7ACC528B82C2EBBD112E91  core/resource-index.d.ts
AC226BDFDF4F71616359795C81F18939C291DFAA7822061CE548D7C5D2F947C7  core/resource-index.d.ts.map
7624D7E17390968313D2D5495F76F3496F17E563D402483BC0D320BB70F3C9A6  core/resource-index.js
6A1B9604885340F2193211098FF08DC5E56649246AC561DAABA6BB40B788F7E5  core/resource-index.js.map
5B2F69E2F39ACDABD988F05BB1822580C56F20FD6BA38F33DDD468DE0BC1FB8F  core/resource-read-runtime.d.ts
423F1B0B0EC880DF4326941DF8B29EB3E17AB9546491BBC8C1DFE3FB560D6269  core/resource-read-runtime.d.ts.map
817E8D5D8982C169A02F1919C91F3A3D13E2D01108BE0CD72B8F3C69546DB108  core/resource-read-runtime.js
C69455C640989FDA063FC56A854E501FC55B2CEFCCD6AB18A08454794E8F85F3  core/resource-read-runtime.js.map
B487C93FB09A01834BB173B500999A9B08FA5881D539C572347CEE2E6F5430AB  domain/json.d.ts
0B6DD60233B935FAB9F2527F6D59D3D51DD425F54FEEB53E0E58BD95B141A0C0  domain/json.d.ts.map
06F1AEE48BFDC36A8194120DF129A85E5A5AEC45EEB4AAE62EE40BDC69DA1325  domain/json.js
6C9219B7DFC008AD72B23B92D8F95ACCE702F364C5FCA813D704A35ADFD63AC2  domain/json.js.map
F89EB8AFCD26FC3C46BD3BE425542372817F14260EE238A38EF2FFCD238D9AFA  domain/scalars.d.ts
36C41829D340E1F9136087490E16A6F9DA08C207C65BFE1F449739E6986A8102  domain/scalars.d.ts.map
03DC79EA3D7F639AE3DAE1207CFC767EE6659C39728945E90D7499EAED436498  domain/scalars.js
AB0EDF4E5A889E9259B51891FEC818BAB63338ADBA102B4C566B04DFFF823747  domain/scalars.js.map
9DDE1E5BCB26D430D7B5F8558BCF2EBF9B18C49DA8947183D87434A2F144A4A8  domain/snapshots.d.ts
E3519943485566CCF07D382177B25D31E35773959B2E681717D4A0DDBFA77942  domain/snapshots.d.ts.map
ED8E2ABF9E06FD62C4932FAEDA2B7B626CA407EF3323000E6D00220E35BE756B  domain/snapshots.js
E03137B814899251A6B04F96C4B5A8A78F1A3A7C652C200A17597300B677310E  domain/snapshots.js.map
4BDB3B4C7D0C65771308C5F6D97EF3EF9C19305EB6BB2E177D170E3C2AA8FEC9  index.d.ts
AE00F2D860A1D4D01FDC887664AA5CC5044EE870035946AE071D1C4BBE3E710D  index.d.ts.map
CE483F6BE70C34B968672BF13F16AB75C4714459AF401479A519101CF61288B3  index.js
8084B262CF9CDE34F5DDD48D76E269EFF5EAC2AC58D16674E12F5E1FB5377EF0  index.js.map
2CF59B076CB5D5530CDFDE5C93A202B23B6E6857C1F4BCCB7A71A0EDA7D59B13  public/contracts.d.ts
13E2DCC02F8C141C6455DFBD39E59E12033D64BE9CB58B279E1DABA4FEC4E5D3  public/contracts.d.ts.map
427A6852D1B4FBC59C12B396120836E73895FB11BEE3EC3841F58F9C9F32499D  public/contracts.js
375D03D1495C59A74C4A035F62BA028766CD333F5FE813D798FD75181EFEFFC6  public/contracts.js.map
96BD2B2FB9CAE9D851D6073098A11FF2FD692CEBC05AB5423A767BFFE59131CA  public/extensia.d.ts
AD3EED33F421D7FBC11A297F1ACF8A7C461B5890440073CE4AC4764E93B4851A  public/extensia.d.ts.map
AFBEAFB18DC937627E0BF8052FE50EF9E89E7F3DBFDF9641F7DAAD8C8B5DFDF8  public/extensia.js
4E1E8BD5997760B2F7320C80DCB646D4EF29FBE7760A56A9EC7E241B872F9AA4  public/extensia.js.map
B829118BA7C973542ABE6190E1F331246A140A72EF1373DAF16BB7EB8BCCFFD2  runtime/facades.d.ts
0E87B30A8BEEA8938942C80A445E6835C7136135E3760FBF961BF4C5DCD24302  runtime/facades.d.ts.map
BF8B1C44741A29303FE211F83C0FC7211EEDAEDADC7281A88105FA121EBE6050  runtime/facades.js
5A10F13CB3786A602F709157F708CF7BBDB9E0A5B316D132AA4E0BF8AE779C74  runtime/facades.js.map
E0133236ECC9E1D821CFDE91C1E887964E82B78F61E04EEF18AF776663C2C810  runtime/lifecycle.d.ts
4A3922527553F27F6C84514BEC02E6083B8D74250A62E6D2791A084A696B6C36  runtime/lifecycle.d.ts.map
BC5EF1DF1C2AC4F12AF189B3B7E693349F3E0FE54CAB23BA0BD2AF8AE96F755F  runtime/lifecycle.js
7E5D1357EF0C9B4CE2620FE9B11D0D7607AD31682B4E065B4DE84B0BC935A6EB  runtime/lifecycle.js.map
8AC975008A8A6BC1D81ECC90FAD522DA93D9D6FDFBBA1066B97C997F3B32B514  system-extensions/default-api/facades.d.ts
135E0AEC33EDA65154F39C40CEAD9E7A2B1177D605CE09A50B4CF11317AE0C92  system-extensions/default-api/facades.d.ts.map
CF4230C242B32D58B8A8A3EA2405624C0566D5F3F53469ACD8F4E8AA2A63534A  system-extensions/default-api/facades.js
68AA19953220455B46BF58CB71BD8BD49B63E6D6A5E6A13508BD5D5CE067E170  system-extensions/default-api/facades.js.map
4D2962C04C45603DCF3FA5734BAC9864522A3445E21785DEB74333251D57D186  system-extensions/default-api/resource-read-port.d.ts
B1EDEB91A2376283B1C5CD82D48336C125F6A4D5AF983233CE403B61E33FFC9B  system-extensions/default-api/resource-read-port.d.ts.map
4BDC4E2AAF1EDEDA48079107B7DBA8B5378AB86B44693E14F50277AC2BEF471F  system-extensions/default-api/resource-read-port.js
D742DEEF45F03F88972AF32CB882C655DFDEADD6079FAEBC2A96092C93705867  system-extensions/default-api/resource-read-port.js.map
```

## Exact sorted packed paths

Count: 66

```text
package/LICENSE
package/dist/composition/diagnostics.d.ts
package/dist/composition/diagnostics.d.ts.map
package/dist/composition/diagnostics.js
package/dist/composition/diagnostics.js.map
package/dist/composition/inspection.d.ts
package/dist/composition/inspection.d.ts.map
package/dist/composition/inspection.js
package/dist/composition/inspection.js.map
package/dist/composition/root.d.ts
package/dist/composition/root.d.ts.map
package/dist/composition/root.js
package/dist/composition/root.js.map
package/dist/composition/tokens.d.ts
package/dist/composition/tokens.d.ts.map
package/dist/composition/tokens.js
package/dist/composition/tokens.js.map
package/dist/core/resource-index.d.ts
package/dist/core/resource-index.d.ts.map
package/dist/core/resource-index.js
package/dist/core/resource-index.js.map
package/dist/core/resource-read-runtime.d.ts
package/dist/core/resource-read-runtime.d.ts.map
package/dist/core/resource-read-runtime.js
package/dist/core/resource-read-runtime.js.map
package/dist/domain/json.d.ts
package/dist/domain/json.d.ts.map
package/dist/domain/json.js
package/dist/domain/json.js.map
package/dist/domain/scalars.d.ts
package/dist/domain/scalars.d.ts.map
package/dist/domain/scalars.js
package/dist/domain/scalars.js.map
package/dist/domain/snapshots.d.ts
package/dist/domain/snapshots.d.ts.map
package/dist/domain/snapshots.js
package/dist/domain/snapshots.js.map
package/dist/index.d.ts
package/dist/index.d.ts.map
package/dist/index.js
package/dist/index.js.map
package/dist/public/contracts.d.ts
package/dist/public/contracts.d.ts.map
package/dist/public/contracts.js
package/dist/public/contracts.js.map
package/dist/public/extensia.d.ts
package/dist/public/extensia.d.ts.map
package/dist/public/extensia.js
package/dist/public/extensia.js.map
package/dist/runtime/facades.d.ts
package/dist/runtime/facades.d.ts.map
package/dist/runtime/facades.js
package/dist/runtime/facades.js.map
package/dist/runtime/lifecycle.d.ts
package/dist/runtime/lifecycle.d.ts.map
package/dist/runtime/lifecycle.js
package/dist/runtime/lifecycle.js.map
package/dist/system-extensions/default-api/facades.d.ts
package/dist/system-extensions/default-api/facades.d.ts.map
package/dist/system-extensions/default-api/facades.js
package/dist/system-extensions/default-api/facades.js.map
package/dist/system-extensions/default-api/resource-read-port.d.ts
package/dist/system-extensions/default-api/resource-read-port.d.ts.map
package/dist/system-extensions/default-api/resource-read-port.js
package/dist/system-extensions/default-api/resource-read-port.js.map
package/package.json
```

## Pack samples

- Pack A SHA-256: `2A1FCAC12AD04A6F410C0982D45018F31C16BB3D5A0AFBE6F861C144DE5BF761`.
- Pack B SHA-256: `2A1FCAC12AD04A6F410C0982D45018F31C16BB3D5A0AFBE6F861C144DE5BF761`.
- Both samples contained the exact 66-path manifest above.
