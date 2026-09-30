# Optional: free server for the scheduled jobs (Oracle Cloud "Always Free")

**Not needed today.** The scheduled jobs run on GitHub Actions (collect every 3 hours, with the
installed packages cached), which fits a private repository's free 2,000 minutes a month.
Use this guide only if the monthly usage (GitHub → Settings → Billing and licensing → Usage)
gets close to 2,000 as sources are added.

Oracle Cloud's Always Free tier includes a small server that never expires and has no run limit. The
**collect** and **cleanup** jobs run there; GitHub keeps running
**Tests** on every push, and the website stays on Vercel.

The server pulls the latest code from GitHub before every run, so after setup you just
`git push` as usual.

About 45 minutes, once. Keys go only into one file on the server (step 6), never into chat,
code or screenshots.

---

## 1. Oracle Cloud account (10 min)

1. Go to **cloud.oracle.com** → *Sign up* (Free Tier).
2. **Home region: India South (Hyderabad)** or **India West (Mumbai)** (close to the
   Supabase database). The home region can't be changed later.
3. Oracle asks for a card to confirm who you are. Always Free resources are not charged.
4. Recommended, once the account is active: *Billing → Upgrade to Pay As You Go*. Always Free
   resources stay free, and Oracle then never reclaims the server for being "idle" (free-only
   accounts can lose a server that is quiet most of the day, which ours is). Then set a
   budget alert: *Billing → Budgets → Create budget*, amount ₹100, alert at 1%, so you're
   emailed if anything is ever charged.

## 2. Create the server (10 min)

*Menu → Compute → Instances → Create instance*

| Setting | Choose |
| --- | --- |
| Name | `alllens` |
| Image | **Canonical Ubuntu 24.04** |
| Shape | *Change shape* → **Ampere** → `VM.Standard.A1.Flex`, **2 OCPUs, 12 GB memory** (inside the free 4 OCPU / 24 GB) |
| Networking | defaults (a new virtual cloud network, public IPv4 address: yes) |
| SSH keys | **Generate a key pair for me** → *Save private key* |

Click **Create**. When it shows *Running*, copy the **Public IP address**.

- If it says *Out of capacity*: try 1 OCPU / 6 GB, another *Availability domain*, or try again
  in a few hours.
- The private key file you saved is the only way into the server. Keep it like a password:
  move it to `C:\Users\<you>\.ssh\alllens.key`. Don't put it in the project folder or share it.

## 3. Connect from VS Code (5 min)

In the VS Code terminal (PowerShell):

```powershell
icacls "$env:USERPROFILE\.ssh\alllens.key" /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i "$env:USERPROFILE\.ssh\alllens.key" ubuntu@PUBLIC_IP
```

(`icacls` makes the key readable only by you; ssh refuses keys others can read.) Type `yes`
the first time. The prompt changes to `ubuntu@alllens:~$`: you are on the server. Steps 4–8
are typed there.

## 4. Let the server read the private repository (5 min)

A *deploy key* gives this one server read-only access to this one repository.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_alllens -N ""
printf 'Host github.com\n  IdentityFile ~/.ssh/github_alllens\n' >> ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts
cat ~/.ssh/github_alllens.pub
```

Copy the line starting `ssh-ed25519` (it's the *public* half, safe to copy). On GitHub:
repository → **Settings → Deploy keys → Add deploy key**, title `oracle server`, paste it,
leave *Allow write access* **unticked**, *Add key*.

## 5. Get the code and install (10 min, mostly waiting)

```bash
git clone git@github.com:SaiKrishna-Sajjanam/alllens.git ~/alllens
bash ~/alllens/deploy/server/setup.sh
```

## 6. Put the keys in (5 min)

```bash
nano ~/alllens.env
```

Fill in the value between the single quotes:

- `DATABASE_URL`: Supabase → **Connect** → *Session pooler* URI, with your database password in
  it (GitHub secrets can't be read back, so copy it from Supabase again).

Save: **Ctrl+O**, **Enter**, then **Ctrl+X**. The file is readable only by you on the server.

## 7. First run, then switch the schedules on (10 min)

```bash
bash ~/alllens/deploy/server/run.sh collect
```

The first run downloads the grouping model (~5 min). It ends with `Feeds OK: ...` and
`Tagged ... grouped ...`. Then:

```bash
sudo systemctl enable --now alllens-collect.timer alllens-cleanup.timer
systemctl list-timers 'alllens*'
```

The list shows the next run of each job (times in UTC; India is UTC+5:30).

## 8. Stop the same jobs on GitHub (2 min)

GitHub repository → **Settings → Secrets and variables → Actions → Variables** →
*New repository variable*: name `SCHEDULE_ON_GITHUB`, value `off`.

GitHub then skips its scheduled collect and clean-up runs (skipped runs use no minutes).
*Run workflow* by hand still works there, as a backup. To go back, delete the variable.

---

## Everyday use

| Want to | Do |
| --- | --- |
| Deploy new code | `git push` on your computer; the server uses it from its next run |
| See the last collect | `journalctl -u alllens@collect -n 40 --no-pager` (on the server), or Supabase table `runs` |
| Run collect now | `sudo systemctl start alllens@collect` |
| Re-tag stored articles (after editing places/topics) | `bash ~/alllens/deploy/server/run.sh collect --retag` |
| Regroup all stories | `bash ~/alllens/deploy/server/run.sh collect --regroup` |
| Check feeds | `bash ~/alllens/deploy/server/run.sh check_feeds` |
| Change a key | `nano ~/alllens.env` |
| Pause everything | `sudo systemctl stop alllens-collect.timer alllens-cleanup.timer` |
| Keep the server's system up to date (monthly) | `sudo apt-get update && sudo apt-get upgrade -y && sudo reboot` |
