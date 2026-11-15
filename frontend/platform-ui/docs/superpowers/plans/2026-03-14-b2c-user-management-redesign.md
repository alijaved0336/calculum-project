# B2C User Management Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Admin User Management view with a modern grid + side drawer that exposes Azure B2C identity data and management actions per user.

**Architecture:** New `AdminUserB2CController` handles all B2C-specific REST endpoints; extended `MicrosoftGraphService` adds MFA, audit log, account control, and delete methods. Frontend adds a `useUserDrawer.ts` composable, redesigns `CompanyUsersGlobal.vue` with a click-to-open drawer, and introduces tab components per identity type.

**Tech Stack:** PHP 8.1 / Symfony 6.4 / API Platform 3.4 / Doctrine ORM / PostgreSQL 16 / Microsoft Graph SDK / Vue 3 Composition API / TypeScript / Apollo GraphQL

**Spec:** `docs/superpowers/specs/2026-03-13-b2c-user-management-redesign.md`
**Work Item:** #14599
**Branches:** `feature/14599-b2c-user-management-redesign` (both repos)

---

## File Map

### Backend (`d:/repos/code/web-app`)

| File | Action | Responsibility |
|---|---|---|
| `src/Entity/User.php` | Modify | Add `identityProvider` field + getter/setter |
| `migrations/Version20260314050000.php` | Create | Add `identity_provider` column to `user` table |
| `migrations/Version20260314040717.php` | Already done | Invitation fields migration (invitationToken, invitationTokenExpiration, invitedByUser on User) |
| `src/Entity/Company/UserCompany.php` | Modify | Add `invitedByUser` ManyToOne relation (FK: `invited_by_user_id`) |
| `migrations/Version20260314055000.php` | Create | Add `invited_by_user_id` FK to `user_company` |
| `src/Command/BackfillIdentityProviderCommand.php` | Create | Console cmd to populate `identity_provider` for existing users via Graph |
| `migrations/Version20260314060000.php` | Create | Recreate `user_company_graphql` view to include `identity_provider` + `azure_last_invitation_date` |
| `src/Entity/GraphQL/CompanyUserGraphQL.php` | Modify | Add `identityProvider` + `azureLastInvitationDate` fields |
| `src/Entity/GraphQL/Dto/CompanyUserGroupedItem.php` | Modify | Add `userAzureId`, `identityProvider`, `azureLastInvitationDate` constructor params + getters |
| `src/ApiPlatform/Resolvers/CompanyUserCollectionResolver.php` | Modify | Select `user_azure_id`, `identity_provider`, `azure_last_invitation_date` from view; pass to DTO |
| `src/Services/MicrosoftGraph/MicrosoftGraphService.php` | Modify | Add `getMfaMethods`, `removeMfaMethod`, `getB2CAuditLogs`, `setAccountEnabled`, `deleteUser` |
| `src/Controller/AdminUserB2CController.php` | Create | 9 new REST endpoints for B2C management |
| `tests/Unit/Services/MicrosoftGraph/MicrosoftGraphServiceTest.php` | Create | Unit tests for 5 new Graph methods (written FIRST, before implementation) |
| `tests/Unit/Entity/Dto/CompanyUserGroupedItemTest.php` | Create | Unit test for new DTO fields |
| `tests/Unit/Command/BackfillIdentityProviderCommandTest.php` | Create | Unit test for `resolveIdentityProvider` helper |
| `tests/Functional/Controller/AdminUserB2CControllerTest.php` | Create | Functional tests for all endpoints (written FIRST, before implementation) |

### Frontend (`d:/repos/code/frontend`)

| File | Action | Responsibility |
|---|---|---|
| `src/composables/useCompanyUsers.ts` | Modify | Add `userAzureId`, `identityProvider`, `azureLastInvitationDate` to `COMPANY_GLOBAL_USERS_QUERY` |
| `src/composables/useUserDrawer.ts` | Create | All B2C API calls + response types |
| `src/modules/adminBackend/views/CompanyUsersGlobal.vue` | Modify | Grid redesign: clickable rows, Identity Provider column, drawer integration |
| `src/modules/adminBackend/components/UserDrawer.vue` | Create | Drawer shell (header, tabs router, close behavior) |
| `src/modules/adminBackend/components/drawer/DrawerTabProfile.vue` | Create | Profile tab (editable name, invitation link + invited-by for pending) |
| `src/modules/adminBackend/components/drawer/DrawerTabSecurity.vue` | Create | Local security: account toggle, last password change, MFA, session invalidate |
| `src/modules/adminBackend/components/drawer/DrawerTabIdentity.vue` | Create | SSO identity tab (issuer, federated details) |
| `src/modules/adminBackend/components/drawer/DrawerTabAccess.vue` | Create | Access table (company/group/roles rows, row-select actions) |
| `src/modules/adminBackend/components/drawer/DrawerTabAudit.vue` | Create | Audit log table (last 20 B2C events) |
| `src/modules/adminBackend/components/drawer/DrawerTabDangerZone.vue` | Create | Delete user + confirmation dialog |

---

## Chunk 1: Backend — DB schema changes

### Task 1: Add `identity_provider` column to User entity

**Files:**
- Modify: `src/Entity/User.php`
- Create: `migrations/Version20260314050000.php`
- Create: `tests/Unit/Entity/Dto/CompanyUserGroupedItemTest.php`

- [ ] **Step 1: Create failing DTO test**

Create `tests/Unit/Entity/Dto/CompanyUserGroupedItemTest.php`:

```php
<?php
declare(strict_types=1);
namespace App\Tests\Unit\Entity\Dto;

use App\Entity\GraphQL\Dto\CompanyUserGroupedItem;
use App\Tests\UnitTestCase;

class CompanyUserGroupedItemTest extends UnitTestCase
{
    public function testHoldsIdentityFields(): void
    {
        $item = new CompanyUserGroupedItem(
            id: 1, enabled: true, roles: [], lastActivity: null,
            invitationToken: null, tokenExpiration: null,
            userUuid: 'uuid-1', userEmail: 'a@b.com',
            userFirstName: 'A', userLastName: 'B', userFullName: 'A B',
            userJobTitle: null, userPhoneNumber: null,
            companyUuid: 'co-uuid', companyName: 'Co',
            companyUiGroupUuid: null, companyUiGroupName: null,
            activeDaysLast30: 0, rolesByCompany: [],
            userAzureId: 'azure-obj-id',
            identityProvider: 'local',
            azureLastInvitationDate: null,
        );

        $this->assertSame('azure-obj-id', $item->getUserAzureId());
        $this->assertSame('local', $item->getIdentityProvider());
        $this->assertNull($item->getAzureLastInvitationDate());
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
php bin/phpunit tests/Unit/Entity/Dto/CompanyUserGroupedItemTest.php -v
```
Expected: FAIL — `CompanyUserGroupedItem` constructor does not have the new params.

- [ ] **Step 3: Add identityProvider to User entity**

In `src/Entity/User.php`, after the `$invitedByUser` field (added in the invitation migration), add:

```php
#[ORM\Column(type: 'string', length: 255, nullable: true)]
#[Groups(['base_id', 'user:read:list', 'user:read:detail', 'usercompany:read:detail'])]
protected ?string $identityProvider = null;
```

Add getter/setter:

```php
public function getIdentityProvider(): ?string
{
    return $this->identityProvider;
}

public function setIdentityProvider(?string $identityProvider): void
{
    $this->identityProvider = $identityProvider;
}
```

- [ ] **Step 4: Create migration**

```php
// migrations/Version20260314050000.php
public function getDescription(): string
{
    return 'Add identity_provider column to user table';
}

public function up(Schema $schema): void
{
    $this->addSql('ALTER TABLE "user" ADD identity_provider VARCHAR(255) DEFAULT NULL');
}

public function down(Schema $schema): void
{
    $this->addSql('ALTER TABLE "user" DROP identity_provider');
}
```

- [ ] **Step 5: Run migration**

```bash
php bin/console doctrine:migrations:migrate --no-interaction
```
Expected: Migration applied cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/Entity/User.php migrations/Version20260314050000.php \
        tests/Unit/Entity/Dto/CompanyUserGroupedItemTest.php
git commit -m "feat: add identity_provider column to user entity"
```

---

### Task 2: Add `invitedByUser` relation to UserCompany

**Files:**
- Modify: `src/Entity/Company/UserCompany.php`
- Create: `migrations/Version20260314055000.php`

> **Context:** The spec (§4.3) requires an `invitedByUser: User|null` field on `UserCompany`, populated when an invitation is sent. The `User` entity already has `invitedByUser` from migration `Version20260314040717` — this is a separate FK on `UserCompany` tracking who sent the invitation to that specific company.

- [ ] **Step 1: Add field to UserCompany entity**

In `src/Entity/Company/UserCompany.php`, add after the `$invitationToken` field:

```php
#[ORM\ManyToOne(targetEntity: User::class)]
#[ORM\JoinColumn(name: 'invited_by_user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
private ?User $invitedByUser = null;
```

Add getter/setter:

```php
public function getInvitedByUser(): ?User
{
    return $this->invitedByUser;
}

public function setInvitedByUser(?User $invitedByUser): void
{
    $this->invitedByUser = $invitedByUser;
}
```

- [ ] **Step 2: Create migration**

```php
// migrations/Version20260314055000.php
public function getDescription(): string
{
    return 'Add invited_by_user_id FK to user_company';
}

public function up(Schema $schema): void
{
    $this->addSql('ALTER TABLE user_company ADD invited_by_user_id INT DEFAULT NULL');
    $this->addSql('ALTER TABLE user_company ADD CONSTRAINT FK_UC_INVITED_BY FOREIGN KEY (invited_by_user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
    $this->addSql('CREATE INDEX IDX_UC_INVITED_BY ON user_company (invited_by_user_id)');
}

public function down(Schema $schema): void
{
    $this->addSql('ALTER TABLE user_company DROP CONSTRAINT FK_UC_INVITED_BY');
    $this->addSql('DROP INDEX IDX_UC_INVITED_BY');
    $this->addSql('ALTER TABLE user_company DROP invited_by_user_id');
}
```

- [ ] **Step 3: Run migration**

```bash
php bin/console doctrine:migrations:migrate --no-interaction
```
Expected: Migration applied cleanly.

- [ ] **Step 4: Run all tests**

```bash
composer test
```
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/Entity/Company/UserCompany.php migrations/Version20260314055000.php
git commit -m "feat: add invitedByUser relation to UserCompany"
```

---

### Task 3: Update view + resolver + DTO for identity fields

**Files:**
- Create: `migrations/Version20260314060000.php`
- Modify: `src/Entity/GraphQL/CompanyUserGraphQL.php`
- Modify: `src/Entity/GraphQL/Dto/CompanyUserGroupedItem.php`
- Modify: `src/ApiPlatform/Resolvers/CompanyUserCollectionResolver.php`

- [ ] **Step 1: Update CompanyUserGroupedItem constructor (makes the failing test from Task 1 pass)**

In `src/Entity/GraphQL/Dto/CompanyUserGroupedItem.php`, add three new constructor params after `rolesByCompany`:

```php
#[Groups(['companyuser:graphql:read'])]
private readonly ?string $userAzureId = null,
#[Groups(['companyuser:graphql:read'])]
private readonly ?string $identityProvider = null,
#[Groups(['companyuser:graphql:read'])]
private readonly ?\DateTimeInterface $azureLastInvitationDate = null,
```

Add getters:

```php
public function getUserAzureId(): ?string
{
    return $this->userAzureId;
}

public function getIdentityProvider(): ?string
{
    return $this->identityProvider;
}

public function getAzureLastInvitationDate(): ?\DateTimeInterface
{
    return $this->azureLastInvitationDate;
}
```

- [ ] **Step 2: Run the failing DTO test — verify it now passes**

```bash
php bin/phpunit tests/Unit/Entity/Dto/CompanyUserGroupedItemTest.php -v
```
Expected: PASS.

- [ ] **Step 3: Add identityProvider + azureLastInvitationDate to CompanyUserGraphQL entity**

In `src/Entity/GraphQL/CompanyUserGraphQL.php`, after `$userAzureId`:

```php
#[ORM\Column(name: 'identity_provider', type: 'string', nullable: true)]
#[Groups(['companyuser:graphql:read'])]
private ?string $identityProvider = null;

#[ORM\Column(name: 'azure_last_invitation_date', type: 'datetime', nullable: true)]
#[Groups(['companyuser:graphql:read'])]
private ?\DateTimeInterface $azureLastInvitationDate = null;
```

Add getters for both.

- [ ] **Step 4: Create view migration including identity_provider and azure_last_invitation_date**

```php
// migrations/Version20260314060000.php
public function getDescription(): string
{
    return 'Recreate user_company_graphql view with identity_provider and azure_last_invitation_date columns';
}

public function up(Schema $schema): void
{
    $this->addSql('DROP VIEW IF EXISTS user_company_graphql');
    $this->addSql(<<<'SQL'
        CREATE VIEW user_company_graphql AS
        SELECT
            COALESCE(uc.id, -u.id) as id,
            COALESCE(uc.enabled, false) as enabled,
            COALESCE(uc.roles, '') as roles,
            u.last_activity,
            uc.invitation_token,
            uc.token_expiration,
            u.id as user_id,
            uc.company_id,
            u.uuid as user_uuid,
            u.azure_id as user_azure_id,
            u.identity_provider as identity_provider,
            u.azure_last_invitation_date as azure_last_invitation_date,
            u.email as user_email,
            u.first_name as user_first_name,
            u.last_name as user_last_name,
            u.first_name || ' ' || u.last_name as user_full_name,
            u.job_title as user_job_title,
            u.phone_number as user_phone_number,
            COALESCE(c.uuid::text, '') as company_uuid,
            COALESCE(c.name, '') as company_name,
            c.ui_group_id as company_ui_group_id,
            ug.uuid as company_ui_group_uuid,
            ug.name as company_ui_group_name,
            COALESCE(
                (SELECT COUNT(DISTINCT DATE(al.created_at))
                 FROM audit_log al
                 WHERE al.user_id = u.id
                 AND al.created_at >= CURRENT_DATE - INTERVAL '30 days'),
                0
            ) as active_days_last_30
        FROM "user" u
        LEFT JOIN user_company uc ON uc.user_id = u.id AND uc.deleted IS NULL
        LEFT JOIN company c ON uc.company_id = c.id AND c.deleted IS NULL
        LEFT JOIN ui_group ug ON c.ui_group_id = ug.id AND ug.deleted IS NULL
        WHERE u.deleted IS NULL
    SQL);
}

public function down(Schema $schema): void
{
    $this->addSql('DROP VIEW IF EXISTS user_company_graphql');
    // Restore previous version (from Version20260227100000) without new columns
    $this->addSql(<<<'SQL'
        CREATE VIEW user_company_graphql AS
        SELECT
            COALESCE(uc.id, -u.id) as id,
            COALESCE(uc.enabled, false) as enabled,
            COALESCE(uc.roles, '') as roles,
            u.last_activity,
            uc.invitation_token,
            uc.token_expiration,
            u.id as user_id,
            uc.company_id,
            u.uuid as user_uuid,
            u.azure_id as user_azure_id,
            u.email as user_email,
            u.first_name as user_first_name,
            u.last_name as user_last_name,
            u.first_name || ' ' || u.last_name as user_full_name,
            u.job_title as user_job_title,
            u.phone_number as user_phone_number,
            COALESCE(c.uuid::text, '') as company_uuid,
            COALESCE(c.name, '') as company_name,
            c.ui_group_id as company_ui_group_id,
            ug.uuid as company_ui_group_uuid,
            ug.name as company_ui_group_name,
            COALESCE(
                (SELECT COUNT(DISTINCT DATE(al.created_at))
                 FROM audit_log al
                 WHERE al.user_id = u.id
                 AND al.created_at >= CURRENT_DATE - INTERVAL '30 days'),
                0
            ) as active_days_last_30
        FROM "user" u
        LEFT JOIN user_company uc ON uc.user_id = u.id AND uc.deleted IS NULL
        LEFT JOIN company c ON uc.company_id = c.id AND c.deleted IS NULL
        LEFT JOIN ui_group ug ON c.ui_group_id = ug.id AND ug.deleted IS NULL
        WHERE u.deleted IS NULL
    SQL);
}
```

- [ ] **Step 5: Run migration**

```bash
php bin/console doctrine:migrations:migrate --no-interaction
```

- [ ] **Step 6: Update CompanyUserCollectionResolver SELECT**

In `src/ApiPlatform/Resolvers/CompanyUserCollectionResolver.php`, the `$dataSql` SELECT (lines ~99-138), add before `FROM %s`:

```sql
(array_agg(user_azure_id ORDER BY last_activity DESC NULLS LAST))[1] AS user_azure_id,
(array_agg(identity_provider ORDER BY last_activity DESC NULLS LAST))[1] AS identity_provider,
MAX(azure_last_invitation_date) AS azure_last_invitation_date,
```

The existing GROUP BY clause (`GROUP BY user_uuid, user_email, user_first_name, user_last_name, user_full_name, user_job_title, user_phone_number`) stays unchanged.

Update the `CompanyUserGroupedItem` constructor call (around line 170) to pass the new fields:

```php
$azureLastInvitationDate = null;
if (isset($row['azure_last_invitation_date']) && $row['azure_last_invitation_date'] !== null) {
    $azureLastInvitationDate = $row['azure_last_invitation_date'] instanceof \DateTimeInterface
        ? \DateTimeImmutable::createFromInterface($row['azure_last_invitation_date'])
        : new \DateTimeImmutable((string) $row['azure_last_invitation_date']);
}

$items[] = new CompanyUserGroupedItem(
    // ... existing params (id, enabled, roles, lastActivity, invitationToken, tokenExpiration,
    //     userUuid, userEmail, userFirstName, userLastName, userFullName, userJobTitle,
    //     userPhoneNumber, companyUuid, companyName, companyUiGroupUuid, companyUiGroupName,
    //     activeDaysLast30, rolesByCompany) ...
    userAzureId: $row['user_azure_id'] ?? null,
    identityProvider: $row['identity_provider'] ?? null,
    azureLastInvitationDate: $azureLastInvitationDate,
);
```

- [ ] **Step 7: Run all tests**

```bash
composer test
```
Expected: All pass. If existing tests construct `CompanyUserGroupedItem` without the new params, add `userAzureId: null, identityProvider: null, azureLastInvitationDate: null` to those call sites.

- [ ] **Step 8: Commit**

```bash
git add src/Entity/GraphQL/CompanyUserGraphQL.php \
        src/Entity/GraphQL/Dto/CompanyUserGroupedItem.php \
        src/ApiPlatform/Resolvers/CompanyUserCollectionResolver.php \
        migrations/Version20260314060000.php
git commit -m "feat: expose userAzureId, identityProvider, azureLastInvitationDate in CompanyUser GraphQL"
```

---

### Task 4: Backfill identity_provider console command

**Files:**
- Create: `tests/Unit/Command/BackfillIdentityProviderCommandTest.php`
- Create: `src/Command/BackfillIdentityProviderCommand.php`

- [ ] **Step 1: Write failing unit test for resolveIdentityProvider**

```php
<?php
// tests/Unit/Command/BackfillIdentityProviderCommandTest.php
declare(strict_types=1);
namespace App\Tests\Unit\Command;

use App\Command\BackfillIdentityProviderCommand;
use App\Tests\UnitTestCase;

class BackfillIdentityProviderCommandTest extends UnitTestCase
{
    private BackfillIdentityProviderCommand $command;

    protected function setUp(): void
    {
        // Use reflection to test the private helper without constructing the full command
        // We test the logic extracted into a public static method
        $this->command = new class extends BackfillIdentityProviderCommand {
            public function __construct() {} // skip parent DI
            public function publicResolve(?array $identities): ?string
            {
                return $this->resolveIdentityProvider($identities);
            }
        };
    }

    public function testResolvesLocalForEmailSignIn(): void
    {
        $identities = [
            $this->makeIdentity('emailAddress', 'contoso.onmicrosoft.com', 'user@example.com'),
        ];
        $this->assertSame('local', $this->command->publicResolve($identities));
    }

    public function testResolvesFederatedDomain(): void
    {
        $identities = [
            $this->makeIdentity('federated', 'google.com', 'google-id-123'),
        ];
        $this->assertSame('google.com', $this->command->publicResolve($identities));
    }

    public function testReturnsNullForEmptyIdentities(): void
    {
        $this->assertNull($this->command->publicResolve([]));
        $this->assertNull($this->command->publicResolve(null));
    }

    private function makeIdentity(string $signInType, string $issuer, string $issuerAssignedId): object
    {
        return new class($signInType, $issuer, $issuerAssignedId) {
            public function __construct(
                private string $signInType,
                private string $issuer,
                private string $issuerAssignedId,
            ) {}
            public function getSignInType(): string { return $this->signInType; }
            public function getIssuer(): string { return $this->issuer; }
            public function getIssuerAssignedId(): string { return $this->issuerAssignedId; }
        };
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
php bin/phpunit tests/Unit/Command/BackfillIdentityProviderCommandTest.php -v
```
Expected: FAIL — class does not exist yet.

- [ ] **Step 3: Create the command**

```php
<?php
// src/Command/BackfillIdentityProviderCommand.php
declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use App\Services\MicrosoftGraph\MicrosoftGraphService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use function App\Statics\Trackings\capture_and_tracking;

#[AsCommand(name: 'app:backfill:identity-provider', description: 'Populate identity_provider for users with an azureId')]
class BackfillIdentityProviderCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly MicrosoftGraphService $graphService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Print changes without saving');
        $this->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Max users to process', '0');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = (bool) $input->getOption('dry-run');
        $limit = (int) $input->getOption('limit');

        $qb = $this->entityManager->createQueryBuilder()
            ->select('u')
            ->from(User::class, 'u')
            ->where('u.azureId IS NOT NULL')
            ->andWhere('u.identityProvider IS NULL')
            ->andWhere('u.deleted IS NULL');

        if ($limit > 0) {
            $qb->setMaxResults($limit);
        }

        $users = $qb->getQuery()->getResult();
        $io->info(sprintf('Processing %d users...', count($users)));

        $updated = 0;
        $errors = 0;
        foreach ($users as $user) {
            try {
                $graphUser = $this->graphService->getUserDetails($user->getAzureId());
                if ($graphUser === null) {
                    $io->warning('No Graph user found for: ' . $user->getUuid());
                    continue;
                }
                $identityProvider = $this->resolveIdentityProvider($graphUser->getIdentities());
                if (!$dryRun) {
                    $user->setIdentityProvider($identityProvider);
                    $this->entityManager->persist($user);
                }
                $io->writeln(sprintf('  %s → %s', $user->getEmail(), $identityProvider ?? 'null'));
                $updated++;
            } catch (\Throwable $e) {
                capture_and_tracking($e);
                $io->error('Error for ' . $user->getUuid() . ': ' . $e->getMessage());
                $errors++;
            }
            if (!$dryRun && $updated % 50 === 0) {
                $this->entityManager->flush();
            }
        }

        if (!$dryRun) {
            $this->entityManager->flush();
        }

        $io->success(sprintf('Done. Updated: %d. Errors: %d', $updated, $errors));
        return Command::SUCCESS;
    }

    /** @param \Microsoft\Graph\Generated\Models\ObjectIdentity[]|null $identities */
    protected function resolveIdentityProvider(?array $identities): ?string
    {
        if ($identities === null || $identities === []) {
            return null;
        }
        foreach ($identities as $identity) {
            if ($identity->getSignInType() === 'federated') {
                return $identity->getIssuer();
            }
        }
        return 'local';
    }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
php bin/phpunit tests/Unit/Command/BackfillIdentityProviderCommandTest.php -v
```
Expected: PASS.

- [ ] **Step 5: Verify the command registers**

```bash
php bin/console app:backfill:identity-provider --help
```
Expected: Shows `--dry-run` and `--limit` options.

- [ ] **Step 6: Commit**

```bash
git add src/Command/BackfillIdentityProviderCommand.php \
        tests/Unit/Command/BackfillIdentityProviderCommandTest.php
git commit -m "feat: add backfill command for user identity_provider"
```

---

## Chunk 2: Backend — MicrosoftGraphService extensions + AdminUserB2CController

### Task 5: Extend MicrosoftGraphService — write tests first

**Files:**
- Create: `tests/Unit/Services/MicrosoftGraph/MicrosoftGraphServiceTest.php`
- Modify: `src/Services/MicrosoftGraph/MicrosoftGraphService.php`

The current service uses the MS Graph SDK. New methods for MFA, audit logs, account enable/disable, and delete need:
- SDK calls where available (`setAccountEnabled`, `deleteUser`)
- Raw Guzzle HTTP calls for endpoints not in PHP SDK v2 (`getMfaMethods`, `removeMfaMethod`, `getB2CAuditLogs`)

- [ ] **Step 1: Write failing unit tests for new Graph methods**

Create `tests/Unit/Services/MicrosoftGraph/MicrosoftGraphServiceTest.php`:

```php
<?php
declare(strict_types=1);
namespace App\Tests\Unit\Services\MicrosoftGraph;

use App\Services\MicrosoftGraph\MicrosoftGraphService;
use App\Tests\UnitTestCase;

/**
 * Tests that new methods exist and handle errors gracefully.
 * Full integration (actual Graph calls) is not tested here — requires live tenant.
 */
class MicrosoftGraphServiceTest extends UnitTestCase
{
    public function testSetAccountEnabledMethodExists(): void
    {
        $this->assertTrue(method_exists(MicrosoftGraphService::class, 'setAccountEnabled'));
    }

    public function testDeleteUserMethodExists(): void
    {
        $this->assertTrue(method_exists(MicrosoftGraphService::class, 'deleteUser'));
    }

    public function testGetMfaMethodsMethodExists(): void
    {
        $this->assertTrue(method_exists(MicrosoftGraphService::class, 'getMfaMethods'));
    }

    public function testRemoveMfaMethodMethodExists(): void
    {
        $this->assertTrue(method_exists(MicrosoftGraphService::class, 'removeMfaMethod'));
    }

    public function testGetB2CAuditLogsMethodExists(): void
    {
        $this->assertTrue(method_exists(MicrosoftGraphService::class, 'getB2CAuditLogs'));
    }

    public function testRemoveMfaMethodThrowsOnUnknownType(): void
    {
        // Create a partial mock — we only test the type validation, not the HTTP call
        $service = $this->getMockBuilder(MicrosoftGraphService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getBearerToken'])
            ->getMock();
        $service->method('getBearerToken')->willReturn('fake-token');

        $this->expectException(\InvalidArgumentException::class);
        $service->removeMfaMethod('user-id', 'unknownType', 'method-id');
    }
}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
php bin/phpunit tests/Unit/Services/MicrosoftGraph/MicrosoftGraphServiceTest.php -v
```
Expected: FAIL — methods do not exist yet.

- [ ] **Step 3: Add private token acquisition helper to MicrosoftGraphService**

In `src/Services/MicrosoftGraph/MicrosoftGraphService.php`, add after `__construct`:

```php
private function getBearerToken(): string
{
    $url = 'https://login.microsoftonline.com/' . $this->tenantId . '/oauth2/v2.0/token';
    $client = new Client();
    $response = $client->post($url, [
        'form_params' => [
            'grant_type'    => 'client_credentials',
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'scope'         => 'https://graph.microsoft.com/.default',
        ],
    ]);
    $data = json_decode((string) $response->getBody(), true);
    return $data['access_token'] ?? throw new \Exception('Could not obtain bearer token');
}
```

- [ ] **Step 4: Add setAccountEnabled**

```php
/**
 * Enable or disable a B2C user account via PATCH /users/{id}.
 * Requires: User.ReadWrite.All (application permission).
 *
 * @throws \Exception
 */
public function setAccountEnabled(string $userId, bool $enabled): void
{
    try {
        $user = new User();
        $user->setAccountEnabled($enabled);
        $this->graphClient->users()->byUserId($userId)->patch($user)->wait();
    } catch (ApiException $e) {
        throw new \Exception('Error setting account enabled: ' . $e->getMessage());
    }
}
```

- [ ] **Step 5: Add deleteUser**

```php
/**
 * Permanently delete a user from B2C via DELETE /users/{id}.
 * Requires: User.ReadWrite.All (application permission).
 *
 * @throws \Exception
 */
public function deleteUser(string $userId): void
{
    try {
        $this->graphClient->users()->byUserId($userId)->delete()->wait();
    } catch (ApiException $e) {
        throw new \Exception('Error deleting user: ' . $e->getMessage());
    }
}
```

- [ ] **Step 6: Add getMfaMethods (raw Guzzle — SDK doesn't support B2C auth methods)**

```php
/**
 * Get registered MFA methods (softwareOath + phone) for a B2C user.
 * Requires: UserAuthenticationMethod.ReadWrite.All (application permission).
 *
 * @return array<int, array{id: string, type: string, label: string}>
 * @throws \Exception
 */
public function getMfaMethods(string $userId): array
{
    $token = $this->getBearerToken();
    $client = new Client(['base_uri' => 'https://graph.microsoft.com/v1.0/']);
    $headers = ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'];

    $methods = [];

    // Software OATH (authenticator apps)
    try {
        $res = $client->get("users/{$userId}/authentication/softwareOathMethods", ['headers' => $headers]);
        $data = json_decode((string) $res->getBody(), true);
        foreach ($data['value'] ?? [] as $m) {
            $methods[] = ['id' => $m['id'], 'type' => 'softwareOath', 'label' => 'Authenticator app'];
        }
    } catch (RequestException $e) {
        capture_and_tracking($e);
    }

    // Phone methods
    try {
        $res = $client->get("users/{$userId}/authentication/phoneMethods", ['headers' => $headers]);
        $data = json_decode((string) $res->getBody(), true);
        foreach ($data['value'] ?? [] as $m) {
            $phone = $m['phoneNumber'] ?? '';
            $label = $phone !== '' ? substr($phone, 0, -4) . '···' . substr($phone, -4) : 'Phone';
            $methods[] = ['id' => $m['id'], 'type' => 'phone', 'label' => (string) $label];
        }
    } catch (RequestException $e) {
        capture_and_tracking($e);
    }

    return $methods;
}
```

- [ ] **Step 7: Add removeMfaMethod**

```php
/**
 * Remove a specific MFA method from a B2C user.
 * Requires: UserAuthenticationMethod.ReadWrite.All (application permission).
 *
 * @param string $type 'softwareOath' or 'phone'
 * @throws \InvalidArgumentException|\Exception
 */
public function removeMfaMethod(string $userId, string $type, string $methodId): void
{
    $endpointMap = [
        'softwareOath' => 'softwareOathMethods',
        'phone'        => 'phoneMethods',
    ];
    $endpoint = $endpointMap[$type] ?? throw new \InvalidArgumentException("Unknown MFA type: {$type}");

    $token = $this->getBearerToken();
    $client = new Client(['base_uri' => 'https://graph.microsoft.com/v1.0/']);
    try {
        $client->delete("users/{$userId}/authentication/{$endpoint}/{$methodId}", [
            'headers' => ['Authorization' => 'Bearer ' . $token],
        ]);
    } catch (RequestException $e) {
        throw new \Exception('Error removing MFA method: ' . $e->getMessage());
    }
}
```

- [ ] **Step 8: Add getB2CAuditLogs**

```php
/**
 * Get last N B2C directory audit log entries for a user.
 * Uses directoryAudits (NOT signIns — unavailable in B2C consumer tenants).
 * Requires: AuditLog.Read.All (application permission).
 *
 * @return array<int, array{activityDateTime: string, result: string, ipAddress: string|null, location: string|null, activityDisplayName: string}>
 * @throws \Exception
 */
public function getB2CAuditLogs(string $userId, int $top = 20): array
{
    $token = $this->getBearerToken();
    $client = new Client(['base_uri' => 'https://graph.microsoft.com/v1.0/']);

    $filter = "loggedByService eq 'B2C' and initiatedBy/user/id eq '{$userId}'";
    $query = http_build_query([
        '$filter'  => $filter,
        '$top'     => $top,
        '$orderby' => 'activityDateTime desc',
    ]);

    try {
        $res = $client->get('auditLogs/directoryAudits?' . $query, [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);
        $data = json_decode((string) $res->getBody(), true);
        $entries = [];
        foreach ($data['value'] ?? [] as $entry) {
            $location = null;
            if (!empty($entry['location']['city'])) {
                $location = $entry['location']['city'] . ', ' . ($entry['location']['countryOrRegion'] ?? '');
            }
            $entries[] = [
                'activityDateTime'    => $entry['activityDateTime'] ?? '',
                'result'              => $entry['result'] === 'success' ? 'success' : 'failure',
                'ipAddress'           => $entry['initiatedBy']['user']['ipAddress'] ?? null,
                'location'            => $location,
                'activityDisplayName' => $entry['activityDisplayName'] ?? '',
            ];
        }
        return $entries;
    } catch (RequestException $e) {
        throw new \Exception('Error fetching B2C audit logs: ' . $e->getMessage());
    }
}
```

Make sure `use function App\Statics\Trackings\capture_and_tracking;` is at the top of the file.

- [ ] **Step 9: Run tests — verify all pass**

```bash
php bin/phpunit tests/Unit/Services/MicrosoftGraph/MicrosoftGraphServiceTest.php -v
```
Expected: All 6 tests PASS.

- [ ] **Step 10: Run full test suite**

```bash
composer test
```
Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add src/Services/MicrosoftGraph/MicrosoftGraphService.php \
        tests/Unit/Services/MicrosoftGraph/MicrosoftGraphServiceTest.php
git commit -m "feat: add getMfaMethods, removeMfaMethod, getB2CAuditLogs, setAccountEnabled, deleteUser to MicrosoftGraphService"
```

---

### Task 6: Create AdminUserB2CController — tests first

**Files:**
- Create: `tests/Functional/Controller/AdminUserB2CControllerTest.php`
- Create: `src/Controller/AdminUserB2CController.php`

> **Note on Azure App Registration:** Before deploying to a live environment, verify that the app registration used by the backend has the following **Application** (not delegated) permissions granted:
> - `UserAuthenticationMethod.ReadWrite.All`
> - `AuditLog.Read.All`
> - `User.ReadWrite.All`
>
> These are required for MFA management, audit log reads, account enable/disable, and user deletion. Without them, all Graph calls will fail with 403. This is an infrastructure step done in the Azure portal — coordinate with the team that manages the B2C tenant.

- [ ] **Step 1: Create failing functional tests**

Create `tests/Functional/Controller/AdminUserB2CControllerTest.php`:

```php
<?php
declare(strict_types=1);
namespace App\Tests\Functional\Controller;

use App\Tests\FunctionalTestCase;

class AdminUserB2CControllerTest extends FunctionalTestCase
{
    // ── Route existence tests (verify routes are registered) ─────────────────

    public function testB2cProfileRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('GET', '/api/admin/user/00000000-0000-0000-0000-000000000000/b2c-profile');
        $this->assertNotSame(404, $this->client->getResponse()->getStatusCode(), 'Route not found');
        // 404 from DB (user not found) is acceptable; Symfony 404 (route not found) is not
        $this->assertSame(404, $this->client->getResponse()->getStatusCode()); // user not found in DB
    }

    public function testMfaMethodsRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('GET', '/api/admin/user/00000000-0000-0000-0000-000000000000/mfa-methods');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode(), 'Method not allowed — route mismatch');
    }

    public function testInvalidateSessionsRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('POST', '/api/admin/user/00000000-0000-0000-0000-000000000000/invalidate-sessions');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode());
    }

    public function testForcePasswordResetReturns501(): void
    {
        $this->loginAsAdmin();
        $this->client->request('POST', '/api/admin/user/00000000-0000-0000-0000-000000000000/force-password-reset');
        // This endpoint is a Phase 2 stub
        $this->assertNotSame(404, $this->client->getResponse()->getStatusCode(), 'Route not found');
    }

    public function testAccountStatusRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('PATCH', '/api/admin/user/00000000-0000-0000-0000-000000000000/account-status',
            [], [], ['CONTENT_TYPE' => 'application/json'], '{"enabled":true}');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode());
    }

    public function testAuditLogsRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('GET', '/api/admin/user/00000000-0000-0000-0000-000000000000/audit-logs');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode());
    }

    public function testInvitationLinkRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('GET', '/api/admin/user/00000000-0000-0000-0000-000000000000/invitation-link');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode());
    }

    public function testDeleteUserRouteExists(): void
    {
        $this->loginAsAdmin();
        $this->client->request('DELETE', '/api/admin/user/00000000-0000-0000-0000-000000000000');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode());
    }

    public function testForcePasswordResetIs501(): void
    {
        $this->loginAsAdmin();
        $this->client->request('POST', '/api/admin/user/00000000-0000-0000-0000-000000000000/force-password-reset');
        $statusCode = $this->client->getResponse()->getStatusCode();
        // Route found: 404 (user not found in DB) or 501 (Phase 2 stub) — not 404 from Symfony routing
        // The stub should return 501 regardless of user existence
        $this->assertSame(501, $statusCode);
    }

    public function testAccountStatusRequiresEnabledField(): void
    {
        $this->loginAsAdmin();
        $this->client->request('PATCH', '/api/admin/user/00000000-0000-0000-0000-000000000000/account-status',
            [], [], ['CONTENT_TYPE' => 'application/json'], '{}');
        $statusCode = $this->client->getResponse()->getStatusCode();
        // 400 bad request (missing enabled field) or 404 (user not found) — either acceptable
        $this->assertContains($statusCode, [400, 404]);
    }

    // ── Route conflict test: UUID regex prevents matching static segments ─────

    public function testResendInvitationRouteNotHijacked(): void
    {
        $this->loginAsAdmin();
        // The resend_invitation route uses a numeric ID, not a UUID.
        // Verify that it still resolves correctly and is NOT matched by AdminUserB2CController.
        $this->client->request('GET', '/api/admin/user/resend_invitation/123');
        $this->assertNotSame(405, $this->client->getResponse()->getStatusCode(), 'Route hijacked by AdminUserB2CController');
    }
}
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
php bin/phpunit tests/Functional/Controller/AdminUserB2CControllerTest.php -v
```
Expected: FAIL — routes do not exist yet (all return 404 from Symfony routing).

- [ ] **Step 3: Create AdminUserB2CController**

```php
<?php
// src/Controller/AdminUserB2CController.php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\Company\UserCompany;
use App\Entity\User;
use App\Services\MicrosoftGraph\MicrosoftGraphService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use function App\Statics\Trackings\capture_and_tracking;

#[IsGranted('ROLE_ADMIN')]
class AdminUserB2CController extends AdaAbstractController
{
    /** UUID v4 regex — prevents matching static route segments like 'resend_invitation' */
    private const UUID_REGEX = '[0-9a-f\-]{36}';

    public function __construct(
        private readonly MicrosoftGraphService $graphService,
    ) {}

    // ── B2C Profile ───────────────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}/b2c-profile',
        name: 'admin_user_b2c_profile',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['GET']
    )]
    public function b2cProfile(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        if ($user->getAzureId() === null) {
            return new JsonResponse(['type' => 'pending', 'issuerDomain' => null, 'identities' => [], 'lastPasswordChangeDateTime' => null]);
        }

        try {
            $graphUser = $this->graphService->getUserDetails($user->getAzureId());
            $identities = [];
            $issuerDomain = null;
            $type = 'local';
            $lastPasswordChange = null;
            if ($graphUser !== null) {
                $lastPasswordChange = $graphUser->getLastPasswordChangeDateTime()?->format(\DateTime::ISO8601);
                foreach ($graphUser->getIdentities() ?? [] as $identity) {
                    $identities[] = [
                        'signInType'       => $identity->getSignInType(),
                        'issuer'           => $identity->getIssuer(),
                        'issuerAssignedId' => $identity->getIssuerAssignedId(),
                    ];
                    if ($identity->getSignInType() === 'federated') {
                        $type = 'sso';
                        $issuerDomain = $identity->getIssuer();
                    }
                }
            }
            return new JsonResponse([
                'type'                     => $type,
                'issuerDomain'             => $issuerDomain,
                'identities'              => $identities,
                'lastPasswordChangeDateTime' => $lastPasswordChange,
            ]);
        } catch (\Throwable $e) {
            capture_and_tracking($e);
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    // ── MFA Methods ───────────────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}/mfa-methods',
        name: 'admin_user_mfa_methods_list',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['GET']
    )]
    public function listMfaMethods(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        if ($user->getAzureId() === null) {
            return new JsonResponse([]);
        }

        try {
            return new JsonResponse($this->graphService->getMfaMethods($user->getAzureId()));
        } catch (\Throwable $e) {
            capture_and_tracking($e);
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    #[Route(
        path: 'api/admin/user/{userUuid}/mfa-methods/{type}/{methodId}',
        name: 'admin_user_mfa_method_delete',
        requirements: ['userUuid' => self::UUID_REGEX, 'type' => 'softwareOath|phone'],
        methods: ['DELETE']
    )]
    public function removeMfaMethod(string $userUuid, string $type, string $methodId, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        if ($user->getAzureId() === null) {
            return new JsonResponse(['error' => 'User has no Azure ID'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->graphService->removeMfaMethod($user->getAzureId(), $type, $methodId);
            return new JsonResponse(null, Response::HTTP_NO_CONTENT);
        } catch (\Throwable $e) {
            capture_and_tracking($e);
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    // ── Session Invalidation ──────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}/invalidate-sessions',
        name: 'admin_user_invalidate_sessions',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['POST']
    )]
    public function invalidateSessions(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        if ($user->getAzureId() === null) {
            return new JsonResponse(['message' => 'No active B2C session'], Response::HTTP_OK);
        }

        try {
            $this->graphService->logoutUserByObjectID($user->getAzureId());
            return new JsonResponse(['message' => 'Sessions invalidated'], Response::HTTP_OK);
        } catch (\Throwable $e) {
            capture_and_tracking($e);
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    // ── Force Password Reset (Phase 2 stub) ───────────────────────────────────

    /**
     * Phase 2 stub: returns 501 until the B2C_1A_signin_local IEF policy
     * is updated to support the extension_forcePasswordChange attribute.
     */
    #[Route(
        path: 'api/admin/user/{userUuid}/force-password-reset',
        name: 'admin_user_force_password_reset',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['POST']
    )]
    public function forcePasswordReset(string $userUuid): JsonResponse
    {
        return new JsonResponse(
            ['message' => 'Force password reset requires an IEF policy update. This feature is coming in Phase 2.'],
            Response::HTTP_NOT_IMPLEMENTED
        );
    }

    // ── Account Status ────────────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}/account-status',
        name: 'admin_user_account_status',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['PATCH']
    )]
    public function setAccountStatus(string $userUuid, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        try {
            $body = $request->toArray();
        } catch (\Throwable) {
            return new JsonResponse(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        if (!isset($body['enabled']) || !is_bool($body['enabled'])) {
            return new JsonResponse(['error' => 'enabled (bool) is required'], Response::HTTP_BAD_REQUEST);
        }

        if ($user->getAzureId() === null) {
            return new JsonResponse(['error' => 'User has no Azure ID'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->graphService->setAccountEnabled($user->getAzureId(), $body['enabled']);
            return new JsonResponse(['enabled' => $body['enabled']], Response::HTTP_OK);
        } catch (\Throwable $e) {
            capture_and_tracking($e);
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    // ── Audit Logs ────────────────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}/audit-logs',
        name: 'admin_user_audit_logs',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['GET']
    )]
    public function auditLogs(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        if ($user->getAzureId() === null) {
            return new JsonResponse([]);
        }

        try {
            return new JsonResponse($this->graphService->getB2CAuditLogs($user->getAzureId(), 20));
        } catch (\Throwable $e) {
            capture_and_tracking($e);
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    // ── Invitation Link ───────────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}/invitation-link',
        name: 'admin_user_invitation_link',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['GET']
    )]
    public function invitationLink(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        // Find the most recently issued still-active UserCompany invitation
        $userCompanies = $em->getRepository(UserCompany::class)->findBy(['user' => $user, 'deleted' => null]);
        $best = null;
        foreach ($userCompanies as $uc) {
            if ($uc->getInvitationToken() === null) continue;
            if ($uc->getTokenExpiration() === null || $uc->getTokenExpiration() < new \DateTime()) continue;
            if ($best === null || $uc->getTokenExpiration() > $best->getTokenExpiration()) {
                $best = $uc;
            }
        }

        if ($best === null) {
            return new JsonResponse(['error' => 'No active invitation found'], Response::HTTP_NOT_FOUND);
        }

        $link = ($_ENV['BACK_BASE_URL'] ?? '') . '/security/invite/' . $best->getInvitationToken() . '/accept';
        return new JsonResponse([
            'invitationLink'  => $link,
            'invitationToken' => $best->getInvitationToken(),
        ]);
    }

    // ── Delete User ───────────────────────────────────────────────────────────

    #[Route(
        path: 'api/admin/user/{userUuid}',
        name: 'admin_user_b2c_delete',
        requirements: ['userUuid' => self::UUID_REGEX],
        methods: ['DELETE']
    )]
    public function deleteUser(string $userUuid, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->findUserOrFail($em, $userUuid);
        if ($user instanceof JsonResponse) return $user;

        $warningHeader = null;

        // Step 1: Delete from B2C (if user has azureId)
        if ($user->getAzureId() !== null) {
            try {
                $this->graphService->deleteUser($user->getAzureId());
            } catch (\Throwable $e) {
                // B2C deletion failed (e.g. user already removed) — log and continue with local delete
                capture_and_tracking($e);
                $warningHeader = 'b2c-user-not-found';
            }
        }

        // Step 2: Soft-delete local records (Gedmo SoftDeleteable on User + UserCompany)
        try {
            $userCompanies = $em->getRepository(UserCompany::class)->findBy(['user' => $user]);
            foreach ($userCompanies as $uc) {
                $em->remove($uc);
            }
            $em->remove($user);
            $em->flush();
        } catch (\Throwable $e) {
            // Graph delete already happened — log critical for manual reconciliation
            capture_and_tracking($e);
            return new JsonResponse(
                ['error' => 'User deleted from identity provider but local record removal failed. Please contact support.'],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }

        $response = new JsonResponse(null, Response::HTTP_NO_CONTENT);
        if ($warningHeader !== null) {
            $response->headers->set('X-Warning', $warningHeader);
        }
        return $response;
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function findUserOrFail(EntityManagerInterface $em, string $userUuid): User|JsonResponse
    {
        $user = $em->getRepository(User::class)->findOneBy(['uuid' => $userUuid]);
        if ($user === null) {
            return new JsonResponse(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        return $user;
    }
}
```

- [ ] **Step 4: Run functional tests — verify they pass**

```bash
php bin/phpunit tests/Functional/Controller/AdminUserB2CControllerTest.php -v
```
Expected: All pass. The force-password-reset test should pass (501 returned regardless of user existence). The route-conflict test should pass (UUID regex prevents hijacking `resend_invitation`).

- [ ] **Step 5: Verify routes in router**

```bash
php bin/console debug:router | grep admin_user_b2c
```
Expected: Shows all 9 new routes with their methods and UUID requirements.

- [ ] **Step 6: Run all backend tests**

```bash
composer test
```
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/Controller/AdminUserB2CController.php \
        tests/Functional/Controller/AdminUserB2CControllerTest.php
git commit -m "feat: add AdminUserB2CController with 9 B2C management endpoints"
```

---

## Chunk 3: Frontend — Data Layer

### Task 7: Update COMPANY_GLOBAL_USERS_QUERY

**Files:**
- Modify: `src/composables/useCompanyUsers.ts`

- [ ] **Step 1: Add the new fields to the global query collection block**

In `COMPANY_GLOBAL_USERS_QUERY` (around lines 51-68), update the `collection` block to include `userAzureId`, `identityProvider`, and `azureLastInvitationDate`:

```graphql
collection {
  _id
  id
  tokenExpiration
  userUuid
  userAzureId
  identityProvider
  azureLastInvitationDate
  userEmail
  userFirstName
  userLastName
  userFullName
  lastActivity
  activeDaysLast30
  companyUuid
  companyName
  companyUiGroupUuid
  companyUiGroupName
  rolesByCompany
  invitationToken
  enabled
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd d:/repos/code/frontend
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useCompanyUsers.ts
git commit -m "feat: add userAzureId, identityProvider, azureLastInvitationDate to COMPANY_GLOBAL_USERS_QUERY"
```

---

### Task 8: Create useUserDrawer composable

**Files:**
- Create: `src/composables/useUserDrawer.ts`

> **Note on HTTP client:** Check how other REST calls are made in this frontend codebase (look at `src/composables/` or `src/modules/` for existing `axios` usage). If the project uses a configured Axios instance (e.g., exported from `src/utils/http.ts` or similar) with auth interceptors, import and use that instance instead of raw `axios`. If no configured instance exists and raw `axios` is already used elsewhere, raw `axios` is fine.

- [ ] **Step 1: Find the project's HTTP client pattern**

```bash
grep -r "import axios" src/ --include="*.ts" --include="*.vue" -l | head -5
grep -r "createAxios\|axiosInstance\|http\.ts" src/ --include="*.ts" -l | head -5
```

If a custom instance is found, update the import in Step 2 accordingly.

- [ ] **Step 2: Create the composable**

```typescript
// src/composables/useUserDrawer.ts
// If the project uses a custom axios instance (e.g. src/utils/http.ts), replace
// the import below with: import http from '@/utils/http'
// and replace axios.get/post/patch/delete with http.get/post/patch/delete
import axios from 'axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface B2CProfile {
  type: 'local' | 'sso' | 'pending'
  issuerDomain: string | null
  identities: Array<{ signInType: string; issuer: string; issuerAssignedId: string }>
  lastPasswordChangeDateTime: string | null
}

export interface MfaMethod {
  id: string
  type: 'softwareOath' | 'phone'
  label: string
}

export interface AuditLogEntry {
  activityDateTime: string
  result: 'success' | 'failure'
  ipAddress: string | null
  location: string | null
  activityDisplayName: string
}

export interface InvitationLinkResponse {
  invitationLink: string
  invitationToken: string
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useUserDrawer() {

  async function fetchB2CProfile(userUuid: string): Promise<B2CProfile> {
    const { data } = await axios.get<B2CProfile>(`/api/admin/user/${userUuid}/b2c-profile`)
    return data
  }

  async function fetchMfaMethods(userUuid: string): Promise<MfaMethod[]> {
    const { data } = await axios.get<MfaMethod[]>(`/api/admin/user/${userUuid}/mfa-methods`)
    return data
  }

  async function removeMfaMethod(
    userUuid: string,
    type: 'softwareOath' | 'phone',
    methodId: string
  ): Promise<void> {
    await axios.delete(`/api/admin/user/${userUuid}/mfa-methods/${type}/${methodId}`)
  }

  async function fetchAuditLogs(userUuid: string): Promise<AuditLogEntry[]> {
    const { data } = await axios.get<AuditLogEntry[]>(`/api/admin/user/${userUuid}/audit-logs`)
    return data
  }

  async function fetchInvitationLink(userUuid: string): Promise<InvitationLinkResponse> {
    const { data } = await axios.get<InvitationLinkResponse>(`/api/admin/user/${userUuid}/invitation-link`)
    return data
  }

  async function deleteUser(userUuid: string): Promise<void> {
    await axios.delete(`/api/admin/user/${userUuid}`)
  }

  async function setAccountEnabled(userUuid: string, enabled: boolean): Promise<void> {
    await axios.patch(`/api/admin/user/${userUuid}/account-status`, { enabled })
  }

  async function forcePasswordReset(userUuid: string): Promise<void> {
    await axios.post(`/api/admin/user/${userUuid}/force-password-reset`)
  }

  async function invalidateSessions(userUuid: string): Promise<void> {
    await axios.post(`/api/admin/user/${userUuid}/invalidate-sessions`)
  }

  /** Resend invitation email — calls existing GET endpoint once per userCompanyId.
   *  Returns partial success info: { succeeded: number[], failed: number[] } */
  async function resendInvitation(userCompanyIds: number[]): Promise<{ succeeded: number[]; failed: number[] }> {
    const succeeded: number[] = []
    const failed: number[] = []
    for (const id of userCompanyIds) {
      try {
        await axios.get(`/api/admin/user/resend_invitation/${id}`)
        succeeded.push(id)
      } catch {
        failed.push(id)
      }
    }
    return { succeeded, failed }
  }

  async function resetIdentityProvider(userUuid: string, companyUuid: string): Promise<void> {
    await axios.post(`/api/admin/user/${userUuid}/company/${companyUuid}/reset-identity-provider`)
  }

  return {
    fetchB2CProfile,
    fetchMfaMethods,
    removeMfaMethod,
    fetchAuditLogs,
    fetchInvitationLink,
    deleteUser,
    setAccountEnabled,
    forcePasswordReset,
    invalidateSessions,
    resendInvitation,
    resetIdentityProvider,
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useUserDrawer.ts
git commit -m "feat: add useUserDrawer composable for B2C API calls"
```

---

## Chunk 4: Frontend — Drawer Components

Create the drawer subdirectory before starting:
```bash
mkdir -p d:/repos/code/frontend/src/modules/adminBackend/components/drawer
```

### Task 9: Create UserDrawer shell

**Files:**
- Create: `src/modules/adminBackend/components/UserDrawer.vue`

- [ ] **Step 1: Create the drawer shell**

```vue
<!-- src/modules/adminBackend/components/UserDrawer.vue -->
<template lang="pug">
teleport(to="body")
  transition(name="drawer-slide")
    .user-drawer(v-if="user" :class="{ 'drawer-overlay': viewportIsSmall }")
      .drawer-backdrop(v-if="viewportIsSmall" @click="$emit('close')")

      .drawer-panel
        //- Header
        .drawer-header
          .drawer-avatar(:style="{ backgroundColor: avatarBgColor }")
            span {{ avatarInitials }}
          .drawer-header-info
            .drawer-header-name {{ user.userFullName }}
            .drawer-header-email {{ user.userEmail }}
            .drawer-header-badge
              span.badge(:class="badgeClass") {{ badgeLabel }}
          button.drawer-close(@click="$emit('close')" aria-label="Close")
            i.fa.fa-times

        //- Tabs
        .drawer-tabs
          button.drawer-tab(
            v-for="tab in availableTabs"
            :key="tab.key"
            :class="{ active: activeTab === tab.key, 'tab-danger': tab.key === 'danger' }"
            @click="activeTab = tab.key"
          ) {{ tab.label }}

        //- Tab content
        .drawer-content
          DrawerTabProfile(
            v-if="activeTab === 'profile'"
            :user="user"
            @updated="$emit('updated', $event)"
          )
          DrawerTabSecurity(
            v-else-if="activeTab === 'security' && identityType === 'local'"
            :user="user"
            @reset-idp="handleResetIdp"
            @resend-invitation="handleResendInvitation"
          )
          DrawerTabIdentity(
            v-else-if="activeTab === 'identity' && identityType === 'sso'"
            :user="user"
          )
          DrawerTabAccess(
            v-else-if="activeTab === 'access'"
            :user="user"
          )
          DrawerTabAudit(
            v-else-if="activeTab === 'audit' && identityType !== 'pending'"
            :user="user"
          )
          DrawerTabDangerZone(
            v-else-if="activeTab === 'danger'"
            :user="user"
            @deleted="$emit('deleted', $event)"
          )

        //- Action banner (resend invitation result)
        transition(name="fade")
          .action-banner(v-if="actionBanner" :class="actionBanner.type")
            | {{ actionBanner.message }}
            button.btn-close-banner(@click="actionBanner = null") ×
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { AVATAR_COLORS_BY_LETTER, AVATAR_COLOR_DEFAULT } from '@/utils/ColorsGroups'
import { useUserDrawer } from '@/composables/useUserDrawer'
import DrawerTabProfile from './drawer/DrawerTabProfile.vue'
import DrawerTabSecurity from './drawer/DrawerTabSecurity.vue'
import DrawerTabIdentity from './drawer/DrawerTabIdentity.vue'
import DrawerTabAccess from './drawer/DrawerTabAccess.vue'
import DrawerTabAudit from './drawer/DrawerTabAudit.vue'
import DrawerTabDangerZone from './drawer/DrawerTabDangerZone.vue'

interface UserRow {
  userUuid: string
  userFullName: string
  userFirstName: string
  userLastName: string
  userEmail: string
  userAzureId: string | null
  identityProvider: string | null
  companyUuid: string
  companyName: string
  rolesByCompany: Record<string, { roles: string[]; companyName: string }>
  invitationToken: string | null
  tokenExpiration: string | null
  id: number
}

const props = defineProps<{ user: UserRow | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', user: UserRow): void
  (e: 'deleted', userUuid: string): void
}>()

const { resendInvitation, resetIdentityProvider } = useUserDrawer()
const activeTab = ref('profile')
const viewportIsSmall = ref(window.innerWidth < 960)
const actionBanner = ref<{ type: 'success' | 'warning'; message: string } | null>(null)

const identityType = computed<'local' | 'sso' | 'pending'>(() => {
  if (!props.user || props.user.userAzureId === null) return 'pending'
  if (!props.user.identityProvider || props.user.identityProvider === 'local') return 'local'
  return 'sso'
})

const availableTabs = computed(() => {
  const tabs = [{ key: 'profile', label: 'Profile' }]
  if (identityType.value === 'local') tabs.push({ key: 'security', label: 'Security' })
  if (identityType.value === 'sso') tabs.push({ key: 'identity', label: 'Identity' })
  tabs.push({ key: 'access', label: 'Access' })
  if (identityType.value !== 'pending') tabs.push({ key: 'audit', label: 'Audit' })
  tabs.push({ key: 'danger', label: 'Danger Zone' })
  return tabs
})

const avatarInitials = computed(() => {
  if (!props.user) return ''
  return ((props.user.userFirstName?.[0] ?? '') + (props.user.userLastName?.[0] ?? '')).toUpperCase()
})

const avatarBgColor = computed(() => {
  const letter = props.user?.userLastName?.[0]?.toUpperCase()
  if (!letter || letter < 'A' || letter > 'Z') return AVATAR_COLOR_DEFAULT
  return AVATAR_COLORS_BY_LETTER[letter.charCodeAt(0) - 65] ?? AVATAR_COLOR_DEFAULT
})

const badgeClass = computed(() => ({
  'badge-local': identityType.value === 'local',
  'badge-sso': identityType.value === 'sso',
  'badge-pending': identityType.value === 'pending',
}))

const badgeLabel = computed(() => {
  if (identityType.value === 'pending') return 'Signup Pending'
  if (identityType.value === 'sso') return `SSO — ${props.user?.identityProvider ?? ''}`
  return 'Local'
})

// Reset to profile tab when a different user is selected
watch(() => props.user?.userUuid, () => { activeTab.value = 'profile' })

async function handleResendInvitation(userCompanyIds: number[]) {
  const { succeeded, failed } = await resendInvitation(userCompanyIds)
  if (failed.length === 0) {
    actionBanner.value = { type: 'success', message: `Invitation resent to ${succeeded.length} company(ies).` }
  } else {
    actionBanner.value = {
      type: 'warning',
      message: `Invitation resent to ${succeeded.length} company(ies). Failed for ${failed.length} company(ies).`,
    }
  }
  setTimeout(() => { actionBanner.value = null }, 5000)
}

async function handleResetIdp() {
  if (!props.user) return
  await resetIdentityProvider(props.user.userUuid, props.user.companyUuid)
  emit('updated', props.user)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function onResize() {
  viewportIsSmall.value = window.innerWidth < 960
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.user-drawer {
  position: fixed; top: 0; right: 0; height: 100vh; width: 440px; z-index: 1050; display: flex;
}
.drawer-overlay .drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: -1;
}
.drawer-panel {
  width: 440px; height: 100%; background: #fff; border-left: 1px solid #e5e7eb;
  display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.08); overflow: hidden;
}
.drawer-header {
  display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid #f3f4f6;
}
.drawer-avatar {
  width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 18px; font-weight: 600; color: #fff; flex-shrink: 0;
}
.drawer-header-info { flex: 1; min-width: 0; }
.drawer-header-name { font-weight: 600; font-size: 15px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drawer-header-email { font-size: 13px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drawer-header-badge { margin-top: 4px; }
.drawer-close { background: none; border: none; padding: 4px 8px; cursor: pointer; color: #6b7280; font-size: 16px; }
.drawer-close:hover { color: #111827; }
.drawer-tabs {
  display: flex; border-bottom: 1px solid #e5e7eb; overflow-x: auto; flex-shrink: 0;
}
.drawer-tab {
  padding: 12px 16px; border: none; background: none; font-size: 13px; color: #6b7280;
  cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.15s, border-color 0.15s;
}
.drawer-tab:hover { color: #111827; }
.drawer-tab.active { color: #111827; border-bottom-color: #111827; font-weight: 500; }
.drawer-tab.tab-danger { color: #dc2626; }
.drawer-tab.tab-danger.active { border-bottom-color: #dc2626; }
.drawer-content { flex: 1; overflow-y: auto; padding: 20px; }
.action-banner {
  padding: 10px 16px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;
}
.action-banner.success { background: #d1fae5; color: #065f46; }
.action-banner.warning { background: #fef3c7; color: #92400e; }
.btn-close-banner { background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 4px; }
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.25s ease; }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.badge-local { background: #f3f4f6; color: #374151; }
.badge-sso { background: #f3f4f6; color: #374151; }
.badge-pending { background: #fef9c3; color: #854d0e; }
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/adminBackend/components/UserDrawer.vue
git commit -m "feat: add UserDrawer shell component"
```

---

### Task 10: Create drawer tab components

**Files:**
- Create: `src/modules/adminBackend/components/drawer/DrawerTabDangerZone.vue`
- Create: `src/modules/adminBackend/components/drawer/DrawerTabAudit.vue`
- Create: `src/modules/adminBackend/components/drawer/DrawerTabAccess.vue`
- Create: `src/modules/adminBackend/components/drawer/DrawerTabSecurity.vue`
- Create: `src/modules/adminBackend/components/drawer/DrawerTabIdentity.vue`
- Create: `src/modules/adminBackend/components/drawer/DrawerTabProfile.vue`

- [ ] **Step 1: Create DrawerTabDangerZone.vue**

```vue
<!-- src/modules/adminBackend/components/drawer/DrawerTabDangerZone.vue -->
<template lang="pug">
.danger-zone
  .danger-warning-box
    p.danger-title Delete User Account
    p.danger-desc(v-if="identityType === 'sso'")
      | This will remove the user from this platform and their Azure B2C linked account.
      | Their corporate identity provider account will not be affected.
    p.danger-desc(v-else-if="identityType === 'pending'")
      | This will cancel the pending invitation and permanently remove the user record from the platform.
    p.danger-desc(v-else)
      | Once you delete a user, there is no going back. All information and settings will be permanently deleted from the platform and from Azure B2C.
    button.btn.btn-danger(@click="showConfirm = true" :disabled="deleting") Delete User Account

  teleport(to="body")
    .confirm-overlay(v-if="showConfirm" @click.self="showConfirm = false")
      .confirm-dialog
        h5 Are you sure?
        p
          | You are about to permanently delete&nbsp;
          strong {{ user.userFullName }}
          | . This action cannot be undone.
        .confirm-actions
          button.btn.btn-secondary(@click="showConfirm = false") Cancel
          button.btn.btn-danger(@click="confirmDelete" :disabled="deleting")
            span(v-if="deleting").spinner-border.spinner-border-sm.me-1
            | Yes, delete permanently

  .alert.alert-danger.mt-3(v-if="errorMessage") {{ errorMessage }}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserDrawer } from '@/composables/useUserDrawer'

const props = defineProps<{
  user: { userUuid: string; userFullName: string; userAzureId: string | null; identityProvider: string | null }
}>()
const emit = defineEmits<{ (e: 'deleted', userUuid: string): void }>()

const { deleteUser } = useUserDrawer()
const showConfirm = ref(false)
const deleting = ref(false)
const errorMessage = ref<string | null>(null)

const identityType = computed(() => {
  if (!props.user.userAzureId) return 'pending'
  return !props.user.identityProvider || props.user.identityProvider === 'local' ? 'local' : 'sso'
})

async function confirmDelete() {
  deleting.value = true
  errorMessage.value = null
  try {
    await deleteUser(props.user.userUuid)
    showConfirm.value = false
    emit('deleted', props.user.userUuid)
  } catch {
    errorMessage.value = 'Could not delete user. Please try again.'
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.danger-warning-box { border: 1px solid #fca5a5; background: #fff5f5; border-radius: 8px; padding: 20px; }
.danger-title { font-weight: 600; color: #dc2626; margin-bottom: 8px; }
.danger-desc { font-size: 13px; color: #4b5563; margin-bottom: 16px; }
.confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.confirm-dialog { background: #fff; border-radius: 8px; padding: 24px; max-width: 400px; width: 100%; }
.confirm-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Create DrawerTabAudit.vue**

```vue
<!-- src/modules/adminBackend/components/drawer/DrawerTabAudit.vue -->
<template lang="pug">
.audit-tab
  .text-center.py-4(v-if="loading")
    .spinner-border.spinner-border-sm

  .alert.alert-danger.d-flex.align-items-center.gap-2(v-else-if="error")
    | Could not load audit data.
    button.btn.btn-link.btn-sm.p-0(@click="load") Try again

  .text-muted.text-center.py-4(v-else-if="entries.length === 0") No sign-in history available.

  template(v-else)
    table.audit-table.w-100
      thead
        tr
          th Date / Time
          th Status
          th IP Address
          th Location
      tbody
        tr(v-for="entry in entries" :key="entry.activityDateTime + entry.ipAddress")
          td {{ formatDate(entry.activityDateTime) }}
          td
            span.badge(:class="entry.result === 'success' ? 'badge-success-audit' : 'badge-failure-audit'")
              | {{ entry.result === 'success' ? 'Success' : 'Failed' }}
          td {{ entry.ipAddress ?? '—' }}
          td {{ entry.location ?? '—' }}
    .audit-footer Showing last 20 recent accesses from Azure B2C
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserDrawer, type AuditLogEntry } from '@/composables/useUserDrawer'

const props = defineProps<{ user: { userUuid: string } }>()
const { fetchAuditLogs } = useUserDrawer()
const loading = ref(false)
const error = ref(false)
const entries = ref<AuditLogEntry[]>([])

async function load() {
  loading.value = true; error.value = false
  try { entries.value = await fetchAuditLogs(props.user.userUuid) }
  catch { error.value = true }
  finally { loading.value = false }
}

function formatDate(iso: string): string {
  return iso ? new Date(iso).toLocaleString() : '—'
}

onMounted(load)
</script>

<style scoped>
.audit-table { font-size: 13px; border-collapse: collapse; }
.audit-table th { padding: 8px 10px; font-weight: 500; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
.audit-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
.badge-success-audit { background: #d1fae5; color: #065f46; }
.badge-failure-audit { background: #fee2e2; color: #991b1b; }
.audit-footer { margin-top: 12px; font-size: 12px; color: #9ca3af; text-align: center; }
</style>
```

- [ ] **Step 3: Create DrawerTabAccess.vue**

> **Note on Group column:** The `rolesByCompany` map (keyed by companyUuid) contains `{ roles, companyName }` but not the UI group name. The group name is available in the GraphQL query as `companyUiGroupName` at the top-level user row. When building the drawer, pass this value through props or use a separate lookup from the user row. For this iteration, if `companyUiGroupName` is available on the parent user row, pass it as a prop. Otherwise show `—` and note this as a known limitation pending a richer `rolesByCompany` map.

```vue
<!-- src/modules/adminBackend/components/drawer/DrawerTabAccess.vue -->
<template lang="pug">
.access-tab
  .d-flex.align-items-center.justify-content-between.mb-3
    span.fw-semibold Company Access
    button.btn.btn-sm.btn-outline-primary(@click="$emit('grant')") Grant Access

  .text-muted.small(v-if="companyEntries.length === 0") No company access found.

  table.access-table.w-100(v-else)
    thead
      tr
        th Company
        th Group
        th Roles
    tbody
      tr(
        v-for="entry in companyEntries"
        :key="entry.companyUuid"
        :class="{ 'row-selected': selectedCompanyUuid === entry.companyUuid }"
        @click="selectRow(entry.companyUuid)"
      )
        td {{ entry.companyName }}
        td {{ entry.groupName ?? '—' }}
        td {{ entry.roles.join(', ') }}

  transition(name="fade")
    .access-actions(v-if="selectedCompanyUuid")
      button.btn.btn-sm.btn-outline-secondary(@click="$emit('edit-roles', selectedCompanyUuid)") Edit Roles
      button.btn.btn-sm.btn-outline-danger(@click="$emit('remove', selectedCompanyUuid)") Remove from Company
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  user: {
    companyUiGroupName?: string | null
    rolesByCompany: Record<string, { roles: string[]; companyName: string }>
  }
}>()
defineEmits<{
  (e: 'grant'): void
  (e: 'edit-roles', companyUuid: string): void
  (e: 'remove', companyUuid: string): void
}>()

const selectedCompanyUuid = ref<string | null>(null)

const companyEntries = computed(() =>
  Object.entries(props.user.rolesByCompany ?? {}).map(([companyUuid, info]) => ({
    companyUuid,
    companyName: info.companyName,
    roles: info.roles ?? [],
    // Group name is aggregated at user level; for multi-company users it may span multiple groups
    groupName: props.user.companyUiGroupName ?? null,
  }))
)

function selectRow(uuid: string) {
  selectedCompanyUuid.value = selectedCompanyUuid.value === uuid ? null : uuid
}
</script>

<style scoped>
.access-table { font-size: 13px; border-collapse: collapse; }
.access-table th { padding: 8px 10px; font-weight: 500; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
.access-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
.access-table tr { cursor: pointer; }
.access-table tr:hover td { background: #f3f4f6; }
.row-selected td { background: #f3f4f6 !important; border-left: 3px solid #ff2c4f; }
.access-actions { display: flex; gap: 8px; margin-top: 12px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 4: Create DrawerTabSecurity.vue**

```vue
<!-- src/modules/adminBackend/components/drawer/DrawerTabSecurity.vue -->
<template lang="pug">
.security-tab
  .text-center.py-4(v-if="loading")
    .spinner-border.spinner-border-sm

  .alert.alert-danger.d-flex.align-items-center.gap-2(v-else-if="loadError")
    | Could not load security data.
    button.btn.btn-link.btn-sm.p-0(@click="load") Try again

  template(v-else)
    //- Account Status
    .security-section
      .section-title Account Status
      .d-flex.align-items-center.justify-content-between
        span
          | Account is&nbsp;
          strong(:class="accountEnabled ? 'text-success' : 'text-danger'")
            | {{ accountEnabled ? 'enabled' : 'disabled' }}
        .form-check.form-switch
          input.form-check-input(
            type="checkbox"
            :checked="accountEnabled"
            :disabled="togglingAccount"
            @change="toggleAccount"
          )

    //- B2C Identity
    .security-section
      .section-title B2C Identity
      .security-field
        span.field-label Last password change
        span.field-value {{ lastPasswordChange ?? '—' }}

    //- MFA Methods
    .security-section
      .section-title MFA Methods
      .text-muted.small(v-if="!loadingMfa && mfaMethods.length === 0") No MFA methods registered.
      .text-center.py-2(v-if="loadingMfa")
        .spinner-border.spinner-border-sm
      .mfa-method(v-for="method in mfaMethods" :key="method.id")
        span {{ method.type === 'softwareOath' ? '🔐' : '📱' }} {{ method.label }}
        button.btn.btn-sm.btn-outline-danger.ms-auto(
          :disabled="removingMethodId === method.id"
          @click="removeMethod(method)"
        )
          span(v-if="removingMethodId === method.id").spinner-border.spinner-border-sm
          span(v-else) Remove

    //- Security Actions
    .security-section
      .section-title Security Actions
      .security-actions
        button.btn.btn-sm.btn-outline-secondary(
          title="Coming soon — requires IEF policy update"
          disabled
        ) Force Password Reset
        button.btn.btn-sm.btn-outline-secondary(
          :disabled="invalidating"
          @click="doInvalidateSessions"
        )
          span(v-if="invalidating").spinner-border.spinner-border-sm.me-1
          | Invalidate All Sessions
        button.btn.btn-sm.btn-outline-warning(@click="$emit('reset-idp')") Reset Identity Provider
        button.btn.btn-sm.btn-outline-primary(@click="doResendInvitation") Resend Invitation Email

  .alert.alert-danger.mt-3(v-if="actionError") {{ actionError }}
  .alert.alert-success.mt-3(v-if="actionSuccess") {{ actionSuccess }}
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserDrawer, type MfaMethod } from '@/composables/useUserDrawer'

const props = defineProps<{
  user: {
    userUuid: string
    userAzureId: string | null
    rolesByCompany: Record<string, { roles: string[]; companyName: string }>
  }
}>()
const emit = defineEmits<{
  (e: 'reset-idp'): void
  (e: 'resend-invitation', userCompanyIds: number[]): void
}>()

const { fetchB2CProfile, fetchMfaMethods, removeMfaMethod, setAccountEnabled, invalidateSessions } = useUserDrawer()

const loading = ref(false)
const loadingMfa = ref(false)
const loadError = ref(false)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)
const mfaMethods = ref<MfaMethod[]>([])
const lastPasswordChange = ref<string | null>(null)
const accountEnabled = ref<boolean>(true)
const togglingAccount = ref(false)
const removingMethodId = ref<string | null>(null)
const invalidating = ref(false)

async function load() {
  if (!props.user.userAzureId) return
  loading.value = true; loadError.value = false
  try {
    const profile = await fetchB2CProfile(props.user.userUuid)
    lastPasswordChange.value = profile.lastPasswordChangeDateTime
      ? new Date(profile.lastPasswordChangeDateTime).toLocaleDateString()
      : null
  } catch { loadError.value = true }
  finally { loading.value = false }

  // Load MFA separately so partial failure doesn't block the whole tab
  loadingMfa.value = true
  try {
    mfaMethods.value = await fetchMfaMethods(props.user.userUuid)
  } catch { /* show empty list on failure */ }
  finally { loadingMfa.value = false }
}

async function toggleAccount(e: Event) {
  const enabled = (e.target as HTMLInputElement).checked
  togglingAccount.value = true; actionError.value = null
  try {
    await setAccountEnabled(props.user.userUuid, enabled)
    accountEnabled.value = enabled
  } catch {
    actionError.value = 'Could not change account status. Please try again.'
    ;(e.target as HTMLInputElement).checked = !enabled
  } finally { togglingAccount.value = false }
}

async function removeMethod(method: MfaMethod) {
  removingMethodId.value = method.id; actionError.value = null
  try {
    await removeMfaMethod(props.user.userUuid, method.type, method.id)
    mfaMethods.value = mfaMethods.value.filter(m => m.id !== method.id)
    actionSuccess.value = 'MFA method removed.'
    setTimeout(() => { actionSuccess.value = null }, 3000)
  } catch {
    actionError.value = 'Could not remove MFA method. Please try again.'
  } finally { removingMethodId.value = null }
}

async function doInvalidateSessions() {
  invalidating.value = true; actionError.value = null
  try {
    await invalidateSessions(props.user.userUuid)
    actionSuccess.value = 'All sessions invalidated.'
    setTimeout(() => { actionSuccess.value = null }, 3000)
  } catch {
    actionError.value = 'Could not invalidate sessions. Please try again.'
  } finally { invalidating.value = false }
}

function doResendInvitation() {
  // Emit all userCompany IDs so parent can call the endpoint once per company
  // The IDs are available from rolesByCompany — for now emit an empty array placeholder
  // TODO: Pass actual userCompany IDs through the user row prop or a separate query
  emit('resend-invitation', [])
}

onMounted(load)
</script>

<style scoped>
.security-section { margin-bottom: 24px; }
.section-title { font-weight: 600; font-size: 12px; color: #374151; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.security-field { display: flex; gap: 12px; font-size: 13px; }
.field-label { color: #6b7280; min-width: 150px; }
.mfa-method { display: flex; align-items: center; gap: 8px; padding: 8px; background: #f9fafb; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
.security-actions { display: flex; flex-direction: column; gap: 8px; }
</style>
```

- [ ] **Step 5: Create DrawerTabIdentity.vue**

```vue
<!-- src/modules/adminBackend/components/drawer/DrawerTabIdentity.vue -->
<template lang="pug">
.identity-tab
  .text-center.py-4(v-if="loading")
    .spinner-border.spinner-border-sm

  .alert.alert-danger.d-flex.align-items-center.gap-2(v-else-if="error")
    | Could not load identity data.
    button.btn.btn-link.btn-sm.p-0(@click="load") Try again

  template(v-else)
    .identity-section
      .section-title Federated Identity
      .identity-field
        span.field-label Issuer Domain
        span.field-value {{ profile?.issuerDomain ?? '—' }}

    .identity-section
      .section-title Identities
      .text-muted.small(v-if="!profile?.identities?.length") No identity data available.
      .identity-row(v-for="id in (profile?.identities ?? [])" :key="id.issuerAssignedId")
        .identity-row-item
          span.field-label Sign-in type
          span.field-value {{ id.signInType }}
        .identity-row-item
          span.field-label Issuer
          span.field-value {{ id.issuer }}
        .identity-row-item
          span.field-label Issuer ID
          span.field-value {{ id.issuerAssignedId }}
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserDrawer, type B2CProfile } from '@/composables/useUserDrawer'

const props = defineProps<{ user: { userUuid: string } }>()
const { fetchB2CProfile } = useUserDrawer()
const loading = ref(false)
const error = ref(false)
const profile = ref<B2CProfile | null>(null)

async function load() {
  loading.value = true; error.value = false
  try { profile.value = await fetchB2CProfile(props.user.userUuid) }
  catch { error.value = true }
  finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.section-title { font-weight: 600; font-size: 12px; color: #374151; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.identity-section { margin-bottom: 24px; }
.identity-field, .identity-row-item { display: flex; gap: 12px; font-size: 13px; margin-bottom: 6px; }
.field-label { color: #6b7280; min-width: 120px; }
.identity-row { background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
</style>
```

- [ ] **Step 6: Create DrawerTabProfile.vue**

```vue
<!-- src/modules/adminBackend/components/drawer/DrawerTabProfile.vue -->
<template lang="pug">
.profile-tab
  .alert.alert-warning.mb-3(v-if="identityType === 'pending'")
    | This user has not accepted their invitation yet.

  .mb-3
    label.form-label Email
    input.form-control(type="email" :value="user.userEmail" disabled)
    .form-text.text-muted Changing email is not supported (B2C constraint).

  .mb-3
    label.form-label First Name
    input.form-control(type="text" v-model="firstName")

  .mb-3
    label.form-label Last Name
    input.form-control(type="text" v-model="lastName")

  //- Pending-specific fields
  template(v-if="identityType === 'pending'")
    .mb-3
      label.form-label Invitation Link
      .d-flex.gap-2
        input.form-control(type="text" :value="invitationLink ?? (loadingLink ? 'Loading…' : '—')" readonly)
        button.btn.btn-sm.btn-outline-secondary(@click="copyLink" :disabled="!invitationLink" title="Copy")
          i.fa.fa-copy

    .mb-3
      label.form-label Issued On
      input.form-control(:value="issuedOn" disabled)

    .mb-3
      label.form-label Expires On
      .d-flex.align-items-center.gap-2
        input.form-control(:value="expiresOn" disabled)
        span.badge.bg-warning.text-dark(v-if="isExpiringSoon") Expiring soon

    .mb-3(v-if="invitedByName")
      label.form-label Invited By
      input.form-control(:value="invitedByName" disabled)

  .d-flex.gap-2.mt-4
    button.btn.btn-primary(:disabled="saving" @click="save")
      span(v-if="saving").spinner-border.spinner-border-sm.me-1
      | Save
    button.btn.btn-outline-secondary(@click="resetForm") Cancel

  .alert.alert-danger.mt-3(v-if="errorMessage") {{ errorMessage }}
  .alert.alert-success.mt-3(v-if="successMessage") {{ successMessage }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useUserDrawer } from '@/composables/useUserDrawer'

const props = defineProps<{
  user: {
    userUuid: string
    userEmail: string
    userFirstName: string
    userLastName: string
    userAzureId: string | null
    identityProvider: string | null
    invitationToken: string | null
    tokenExpiration: string | null
    azureLastInvitationDate?: string | null
    invitedByName?: string | null  // optional — populated if available from UserCompany
  }
}>()
const emit = defineEmits<{ (e: 'updated', user: unknown): void }>()

const { fetchInvitationLink } = useUserDrawer()

const firstName = ref(props.user.userFirstName)
const lastName = ref(props.user.userLastName)
const saving = ref(false)
const loadingLink = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const invitationLink = ref<string | null>(null)

const identityType = computed(() => {
  if (!props.user.userAzureId) return 'pending'
  return !props.user.identityProvider || props.user.identityProvider === 'local' ? 'local' : 'sso'
})

const issuedOn = computed(() =>
  props.user.azureLastInvitationDate
    ? new Date(props.user.azureLastInvitationDate).toLocaleDateString()
    : '—'
)

const expiresOn = computed(() =>
  props.user.tokenExpiration ? new Date(props.user.tokenExpiration).toLocaleDateString() : '—'
)

const isExpiringSoon = computed(() => {
  if (!props.user.tokenExpiration) return false
  return (new Date(props.user.tokenExpiration).getTime() - Date.now()) / 86400000 <= 14
})

const invitedByName = computed(() => props.user.invitedByName ?? null)

async function loadInvitationLink() {
  if (identityType.value !== 'pending') return
  loadingLink.value = true
  try {
    const res = await fetchInvitationLink(props.user.userUuid)
    invitationLink.value = res.invitationLink
  } catch { invitationLink.value = null }
  finally { loadingLink.value = false }
}

function copyLink() {
  if (invitationLink.value) navigator.clipboard.writeText(invitationLink.value)
}

function resetForm() {
  firstName.value = props.user.userFirstName
  lastName.value = props.user.userLastName
  errorMessage.value = null
  successMessage.value = null
}

async function save() {
  saving.value = true; errorMessage.value = null; successMessage.value = null
  try {
    await axios.patch(`/api/users/${props.user.userUuid}`, {
      firstName: firstName.value,
      lastName: lastName.value,
    })
    successMessage.value = 'Profile updated.'
    emit('updated', { ...props.user, userFirstName: firstName.value, userLastName: lastName.value })
  } catch {
    errorMessage.value = 'Could not save changes. Please try again.'
  } finally { saving.value = false }
}

onMounted(loadInvitationLink)
</script>

<style scoped>
.profile-tab { max-width: 400px; }
</style>
```

- [ ] **Step 7: Verify TypeScript compiles across all new components**

```bash
npx tsc --noEmit
```
Expected: No errors. Fix any type mismatches (e.g. prop types that don't align).

- [ ] **Step 8: Commit**

```bash
git add src/modules/adminBackend/components/drawer/
git commit -m "feat: add drawer tab components (Profile, Security, Identity, Access, Audit, DangerZone)"
```

---

## Chunk 5: Frontend — Grid Redesign

### Task 11: Integrate drawer into CompanyUsersGlobal.vue

**Files:**
- Modify: `src/modules/adminBackend/views/CompanyUsersGlobal.vue`

The existing file is ~1900 lines with Kendo grid and modal-based actions. The changes are:
1. Add `UserDrawer` import and state management
2. Make grid rows clickable (open drawer on click)
3. Add the Identity Provider column
4. Apply selected-row styling

> **Note on Kendo template syntax:** The existing codebase uses cell template components for custom column rendering. Check how columns like "Roles" or "Last Activity" are implemented in this file and follow the same pattern for the Identity Provider column. Do NOT use Vue `v-if` directives inside a Kendo template string — Kendo templates use its own `#if`/`#else` syntax or a template component approach.

- [ ] **Step 1: Add UserDrawer import and drawer state**

In the `<script setup>` section, add near the top of the imports:

```typescript
import UserDrawer from '../components/UserDrawer.vue'
```

Add reactive state:

```typescript
const selectedUser = ref<Record<string, any> | null>(null)

function openDrawer(dataItem: Record<string, any>) {
  selectedUser.value = dataItem
}

function closeDrawer() {
  selectedUser.value = null
}

function onUserDeleted(userUuid: string) {
  closeDrawer()
  refetch() // existing refetch function
}
```

- [ ] **Step 2: Add UserDrawer to template**

In the Pug template, after the existing modal components block, add:

```pug
UserDrawer(
  :user="selectedUser"
  @close="closeDrawer"
  @updated="refetch"
  @deleted="onUserDeleted"
)
```

- [ ] **Step 3: Make grid rows clickable**

Find the Kendo grid component in the template and add `@rowclick`:

```pug
KendoGrid(
  ...existing props...
  :row-class="getRowClass"
  @rowclick="(e) => openDrawer(e.dataItem)"
)
```

Add the row class function to the script:

```typescript
function getRowClass(props: any): string {
  if (selectedUser.value && props.dataItem.userUuid === selectedUser.value.userUuid) {
    return 'grid-row-selected'
  }
  return ''
}
```

- [ ] **Step 4: Add Identity Provider column**

In the grid columns array/definition, insert a new column before the Company column. Use the same cell-template component pattern already used in this file. Create a minimal inline template component:

```typescript
// Add to script setup
const IdentityProviderCell = defineComponent({
  props: { dataItem: Object },
  setup(props) {
    const user = computed(() => props.dataItem as any)
    const label = computed(() => {
      if (!user.value?.userAzureId) return { text: 'Signup Pending', cls: 'badge-pending' }
      if (!user.value?.identityProvider || user.value?.identityProvider === 'local')
        return { text: '🔑 Local', cls: 'badge-local' }
      return { text: `🏢 SSO — ${user.value.identityProvider}`, cls: 'badge-sso' }
    })
    return () => h('span', { class: ['badge', label.value.cls] }, label.value.text)
  }
})
```

Then add to the columns definition:

```typescript
{ field: 'identityProvider', title: 'Identity Provider', width: 180, cell: IdentityProviderCell }
```

- [ ] **Step 5: Add required CSS**

In the `<style>` section:

```css
.grid-row-selected td {
  background: #f3f4f6 !important;
  border-left: 3px solid #ff2c4f;
}
.badge-local { background: #f3f4f6; color: #374151; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.badge-sso { background: #f3f4f6; color: #374151; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.badge-pending { background: #fef9c3; color: #854d0e; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 7: Run all backend tests (unchanged)**

```bash
cd d:/repos/code/web-app && composer test
```
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
cd d:/repos/code/frontend
git add src/modules/adminBackend/views/CompanyUsersGlobal.vue
git commit -m "feat: redesign CompanyUsersGlobal with clickable rows, Identity Provider column, and UserDrawer"
```

---

## Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd d:/repos/code/web-app && composer test
```
Expected: All pass.

- [ ] **Step 2: Run all migrations on local DB**

```bash
php bin/console doctrine:migrations:migrate --no-interaction && php bin/console cache:clear
```

- [ ] **Step 3: Verify backfill command in dry-run**

```bash
php bin/console app:backfill:identity-provider --dry-run --limit=5
```
Expected: Shows up to 5 users with their resolved identity provider. No DB changes.

- [ ] **Step 4: TypeScript check frontend**

```bash
cd d:/repos/code/frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Verify both repos are clean**

```bash
cd d:/repos/code/web-app && git status
cd d:/repos/code/frontend && git status
```
Expected: Both show clean working tree.
