import { useEffect, useState } from "react";
import { Influencer } from "@/types/influencer";
import InfluencerDBService from "@/lib/influencer";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { cn, formatDateTime, generateReferralCode } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { MoreHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const Influencers = () => {
  const [influencerList, setInfluencerList] = useState<Influencer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentInfluencer, setCurrentInfluencer] = useState<Influencer | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const fetchInfluencers = async () => {
    setIsLoading(true);
    try {
      const [influencers, allClicks, allRegistrations] = await Promise.all([
        InfluencerDBService.getAllInfluencers(),
        InfluencerDBService.getAllReferralClicks(),
        InfluencerDBService.getAllReferralRegistrations(),
      ]);

      const clicksMap = allClicks.reduce(
        (acc, click) => {
          acc[click.referral_code] = (acc[click.referral_code] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const registrationsMap = allRegistrations.reduce(
        (acc, reg) => {
          acc[reg.referral_code] = (acc[reg.referral_code] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const influencersWithStats = influencers.map((influencer) => ({
        ...influencer,
        referralClicks: clicksMap[influencer.referralCode] || 0,
        registrationReferrals: registrationsMap[influencer.referralCode] || 0,
      }));

      setInfluencerList(influencersWithStats);
    } catch (error: any) {
      toast.error("Error while fetching Influencers: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selected.length === influencerList.length) {
      setSelected([]);
    } else {
      setSelected(influencerList.map((i) => i.id));
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await InfluencerDBService.deleteInfluencers(selected);
      fetchInfluencers();
      setSelected([]);
      toast.success("Influencers deleted successfully");
    } catch (error: any) {
      toast.error("Error while deleting influencers: ", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    setIsDeletingSingle((prev) => ({ ...prev, [id]: true }));
    try {
      await InfluencerDBService.deleteInfluencers([id]);
      fetchInfluencers();
      toast.success("Influencer deleted successfully");
    } catch (error: any) {
      toast.error("Error while deleting influencer: ", error);
    } finally {
      setIsDeletingSingle((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const isActive = formData.get("isActive") === "active";

    try {
      if (isEdit && currentInfluencer) {
        await InfluencerDBService.updateInfluencer(currentInfluencer.id, {
          name,
          email,
          isActive,
        });

        toast.success("Influencer updated successfully");
      } else {
        let referralCode: string = generateReferralCode();

        while (await InfluencerDBService.checkReferralExists(referralCode)) {
          referralCode = generateReferralCode();
        }

        await InfluencerDBService.createInfluencer({
          name,
          email,
          referralCode,
          isActive: true,
        });
        toast.success("Influencer created successfully");
      }
      fetchInfluencers();
      setOpen(false);
      setIsEdit(false);
      setCurrentInfluencer(null);
    } catch (error: any) {
      toast.error("Error while saving influencer: ", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReferral = (code: string) => {
    const url = `https://runabhujhmad.in/influencer/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Referral link copied to clipboard");
  };

  return (
    <main id="influencer" className="h-screen">
      <section className="container mx-auto p-10 flex flex-col h-full gap-y-4">
        <header className="flex w-full justify-between items-center">
          <h2 className="text-2xl font-bold">Influencer</h2>
          <div className="space-x-4">
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                if (!value) setCurrentInfluencer(null);
              }}
            >
              <DialogTrigger asChild>
                <Button>Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isEdit ? "Edit Influencer" : "Add Influencer"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <Input
                    name="name"
                    placeholder="Name"
                    defaultValue={currentInfluencer?.name}
                    required
                  />
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email"
                    defaultValue={currentInfluencer?.email}
                    required
                  />
                  <Select
                    name="isActive"
                    defaultValue={
                      currentInfluencer?.isActive ? "active" : "inactive"
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Active" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-x-2">
                    <DialogClose asChild>
                      <Button variant="destructive">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={selected.length === 0 || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </header>
        <div className="flex-1 h-full rounded-lg overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={
                      selected.length === influencerList.length &&
                      influencerList.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Referral Clicks</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                influencerList.map((influencer) => (
                  <TableRow key={influencer.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(influencer.id)}
                        onCheckedChange={() => handleSelect(influencer.id)}
                      />
                    </TableCell>
                    <TableCell>{influencer.name}</TableCell>
                    <TableCell>{influencer.email}</TableCell>
                    <TableCell>{influencer.referralCode}</TableCell>
                    <TableCell>{influencer.referralClicks}</TableCell>
                    <TableCell>{influencer.registrationReferrals}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-3 py-1 rounded text-sm border",
                          influencer.isActive
                            ? "bg-green-500/10 border-green-500/50 text-green-500"
                            : "bg-red-500/10 border-red-500/50 text-red-500",
                        )}
                      >
                        {influencer.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(influencer.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setIsEdit(true);
                              setCurrentInfluencer(influencer);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleCopyReferral(influencer.referralCode)
                            }
                          >
                            Copy Referral Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSingle(influencer.id)}
                            disabled={isDeletingSingle[influencer.id]}
                          >
                            {isDeletingSingle[influencer.id]
                              ? "Deleting..."
                              : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
};

export default Influencers;
