using Bogus;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using TimeTravelAgency.Application.Model;

namespace TimeTravelAgency.Application.Infrastructure;

public class TimeTravelAgencyContext : DbContext
{
    public DbSet<Agent> Agents { get; set; }
    public DbSet<LicensedAgent> LicensedAgents { get; set; }
    public DbSet<Report> Reports { get; set; }
    public DbSet<Trip> Trips { get; set; }
    public DbSet<CriticalTrip> CriticalTrips { get; set; }
    public DbSet<Epoch> Epochs { get; set; }
    public DbSet<HistoricalEvent> HistoricalEvents { get; set; }
    public DbSet<Manager> Managers { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<Paradox> Paradoxes { get; set; }

    public TimeTravelAgencyContext(DbContextOptions<TimeTravelAgencyContext> options)
        : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder
                .UseSqlite("Data Source=TimeTravelAgencyTest.db")
                .UseLazyLoadingProxies();
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Epoch
        modelBuilder.Entity<Epoch>()
            .Property(e => e.Id)
            .ValueGeneratedNever();

        modelBuilder.Entity<Epoch>()
            .Property(e => e.Guid)
            .ValueGeneratedOnAdd();

        modelBuilder.Entity<Epoch>()
            .HasAlternateKey(e => e.Guid);

        modelBuilder.Entity<Epoch>()
            .HasMany(e => e.HistoricalEvents)
            .WithOne(h => h.Epoch)
            .HasForeignKey(h => h.EpochId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Epoch>()
            .HasData(
                new Epoch(-4600000000, -4000000000, "Hadean Eon",
                    "The earliest eon in Earth's history, during which the planet was formed and began to cool."),
                new Epoch(-4000000000, -2500000000, "Archean Eon",
                    "Life began in the oceans, with the first single-celled organisms."),
                new Epoch(-2500000000, -541000000, "Proterozoic Eon",
                    "The development of early multicellular life forms and oxygen buildup in Earth's atmosphere."),
                new Epoch(-541000000, -252000000, "Phanerozoic Eon",
                    "The eon encompassing the Cambrian Explosion and the evolution of most major animal phyla."),
                new Epoch(-252000000, -66000000, "Mesozoic Era", "The age of dinosaurs."),
                new Epoch(-66000000, -2500000, "Cenozoic Era", "The age of mammals."),
                new Epoch(-2500000, -11700, "Pleistocene Epoch", "The last ice age."),
                new Epoch(-11700, 2023, "Holocene Epoch", "The current geological epoch."),
                new Epoch(-3100, -30, "Ancient Egypt", "The period of ancient Egyptian civilization."),
                new Epoch(-1600, 1912, "Ancient China", "The period of ancient Chinese civilization."),
                new Epoch(-1500, 1858, "Ancient India", "The period of ancient Indian civilization."),
                new Epoch(-3500, -539, "Ancient Mesopotamia", "The period of ancient Mesopotamian civilization."),
                new Epoch(-550, 651, "Ancient Persia", "The period of ancient Persian civilization."),
                new Epoch(-2000, 1697, "Mayan Civilization",
                    "The period of the Mayan civilization in Mesoamerica."),
                new Epoch(-1200, -586, "Ancient Israel", "The period of ancient Israelite civilization."),
                new Epoch(-753, 476, "Ancient Rome", "The period of ancient Roman civilization."),
                new Epoch(330, 1453, "Byzantine Empire", "The period of the Byzantine Empire."),
                new Epoch(476, 1492, "Middle Ages",
                    "The period of European history from the fall of the Roman Empire to the beginning of the Renaissance."),
                new Epoch(1299, 1922, "Ottoman Empire", "The period of the Ottoman Empire."),
                new Epoch(1300, 1600, "Renaissance",
                    "The period in Europe, from the 14th to the 17th century, considered the bridge between the Middle Ages and modern history."),
                new Epoch(1603, 1868, "Tokugawa Shogunate", "The period of the Tokugawa Shogunate in Japan."),
                new Epoch(1868, 1912, "Meiji Era", "The period of the Meiji Restoration in Japan."),
                new Epoch(1760, 1840, "Industrial Revolution",
                    "The transition to new manufacturing processes in Europe and the United States."),
                new Epoch(1837, 1901, "Victorian Era",
                    "The period of Queen Victoria's reign in the United Kingdom."),
                new Epoch(1914, 1918, "World War I", "The global war originating in Europe."),
                new Epoch(1920, 1929, "Roaring Twenties",
                    "The decade of economic growth and widespread prosperity."),
                new Epoch(1929, 1939, "Great Depression", "The severe worldwide economic depression."),
                new Epoch(1939, 1945, "World War II", "The global war involving most of the world's nations."),
                new Epoch(1947, 1991, "Cold War",
                    "The period of geopolitical tension between the Soviet Union and the United States."),
                new Epoch(1957, 1975, "Space Age",
                    "The period encompassing the activities related to the Space Race."),
                new Epoch(1970, 2000, "Information Age",
                    "The period characterized by the rapid shift from traditional industry to an economy based on information technology."),
                new Epoch(2000, 2020, "Digital Age",
                    "The period marked by the rise of digital technology and the internet."),
                new Epoch(2001, 2020, "Post-9/11 Era", "The period following the September 11 attacks."),
                new Epoch(2020, 2022, "COVID-19 Pandemic", "The global pandemic caused by the coronavirus."),
                new Epoch(2020, 2023, "Modern Era", "The current period of history."),
                new Epoch(2023, 2523, "Future Era", "The next 500 years."),
                new Epoch(2523, 3023, "Interstellar Era", "The period of human expansion beyond the solar system."),
                new Epoch(3023, 3523, "Galactic Era", "The period of human colonization of the Milky Way galaxy."),
                new Epoch(3523, 4023, "Universal Era",
                    "The period of human exploration and colonization of other galaxies."),
                new Epoch(4023, 4523, "Post-Interstellar Era",
                    "The period following the widespread colonization of other galaxies."),
                new Epoch(4523, 5023, "Quantum Era",
                    "The period characterized by advancements in quantum technology."),
                new Epoch(5023, 5523, "Singularity Era",
                    "The period marked by the technological singularity and AI dominance."),
                new Epoch(5523, 6023, "Post-Singularity Era",
                    "The period following the technological singularity."),
                new Epoch(6023, 6523, "Stellar Era",
                    "The period of the rise of new stars and civilizations in the universe."),
                new Epoch(6523, 7023, "Stellar Renaissance",
                    "The period when the universe experiences a renewed explosion of activity, star formations, and cosmic advancements.")
            );

        // HistoricalEvent
        modelBuilder.Entity<HistoricalEvent>()
            .HasOne(h => h.Epoch)
            .WithMany(e => e.HistoricalEvents)
            .HasForeignKey(h => h.EpochId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        modelBuilder.Entity<HistoricalEvent>()
            .HasData(
                new HistoricalEvent("Creation of Earth", -4600000000),
                new HistoricalEvent("First Life on Earth", -3500000000),
                new HistoricalEvent("Cambrian Explosion", -541000000),
                new HistoricalEvent("Formation of Pangaea", -335000000),
                new HistoricalEvent("End of the Permian Period", -252000000),
                new HistoricalEvent("Meteor Strike Leading to Dinosaur Extinction", -66000000),
                new HistoricalEvent("Rise of Homo Sapiens", -300000),
                new HistoricalEvent("Invention of Agriculture", -10000),
                new HistoricalEvent("First Cities Established in Mesopotamia", -3500),
                new HistoricalEvent("Foundation of Ancient Egypt", -3100),
                new HistoricalEvent("The Code of Hammurabi", -1754),
                new HistoricalEvent("Founding of Ancient Greece", -800),
                new HistoricalEvent("Roman Republic Established", -509),
                new HistoricalEvent("Julius Caesar Assassinated", -44),
                new HistoricalEvent("Fall of the Western Roman Empire", 476),
                new HistoricalEvent("Rise of the Byzantine Empire", 330),
                new HistoricalEvent("The Battle of Hastings", 1066),
                new HistoricalEvent("Signing of the Magna Carta", 1215),
                new HistoricalEvent("The Black Death", 1347),
                new HistoricalEvent("Columbus Discovers the Americas", 1492),
                new HistoricalEvent("The Protestant Reformation", 1517),
                new HistoricalEvent("The Spanish Armada Defeated", 1588),
                new HistoricalEvent("The English Civil War", 1642),
                new HistoricalEvent("The American Revolution", 1776),
                new HistoricalEvent("French Revolution", 1789),
                new HistoricalEvent("Industrial Revolution", 1760),
                new HistoricalEvent("First World War", 1914),
                new HistoricalEvent("The Great Depression", 1929),
                new HistoricalEvent("World War II", 1939),
                new HistoricalEvent("The Cold War", 1947),
                new HistoricalEvent("Moon Landing", 1969),
                new HistoricalEvent("Fall of the Berlin Wall", 1989),
                new HistoricalEvent("End of Apartheid", 1994),
                new HistoricalEvent("9/11 Attacks", 2001),
                new HistoricalEvent("COVID-19 Pandemic", 2020)
            );

        // Agent
        modelBuilder.Entity<Agent>()
            .Property(a => a.Guid)
            .HasConversion<Guid>();
        
        modelBuilder.Entity<Agent>()
            .HasAlternateKey(a => a.Guid);
        
        modelBuilder.Entity<Agent>()
            .HasOne(a => a.SpecialisationEpoch)
            .WithMany()
            .HasForeignKey(a => a.EpochId)
            .IsRequired(false);

        modelBuilder.Entity<Agent>()
            .Property(a => a.Guid)
            .ValueGeneratedOnAdd();
        
        // LicensedAgent
        modelBuilder.Entity<LicensedAgent>()
            .Property(a => a.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<LicensedAgent>()
            .HasAlternateKey(a => a.Guid);
        
        modelBuilder.Entity<LicensedAgent>()
            .HasBaseType<Agent>();

        // Customer
        modelBuilder.Entity<Customer>()
            .Property(c => c.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Customer>()
            .HasAlternateKey(c => c.Guid);

        // Trip
        modelBuilder.Entity<Trip>()
            .Property(t => t.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Trip>()
            .HasAlternateKey(t => t.Guid);
        
        modelBuilder.Entity<Trip>()
            .HasOne(t => t.LicensedAgent)
            .WithMany()
            .HasForeignKey(t => t.LicensedAgentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Trip>()
            .HasOne(t => t.Agent)
            .WithMany()
            .HasForeignKey(t => t.AgentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Trip>()
            .HasOne(t => t.Manager)
            .WithMany(m => m.Trips)
            .HasForeignKey(t => t.ManagerId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // CriticalTrip
        modelBuilder.Entity<CriticalTrip>()
            .Property(t => t.Guid);
        
        modelBuilder.Entity<CriticalTrip>()
            .HasAlternateKey(t => t.Guid);
        
        modelBuilder.Entity<CriticalTrip>()
            .HasBaseType<Trip>();

        // Many-to-Many relationship between Trip and Customer
        modelBuilder.Entity<Trip>()
            .HasMany<Customer>(t => t.Customers)
            .WithMany(c => c.Trips)
            .UsingEntity(j => j.ToTable("TripCustomers"));

        // Manager
        modelBuilder.Entity<Manager>()
            .Property(m => m.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Manager>()
            .HasAlternateKey(m => m.Guid);

        // Paradox
        modelBuilder.Entity<Paradox>()
            .Property(m => m.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Paradox>()
            .HasAlternateKey(p => p.Guid);
        
        // Review
        modelBuilder.Entity<Review>()
            .Property(r => r.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Review>()
            .HasAlternateKey(r => r.Guid);
        
        // Report
        modelBuilder.Entity<Report>()
            .Property(r => r.Guid)
            .ValueGeneratedOnAdd();
        
        modelBuilder.Entity<Report>()
            .HasAlternateKey(r => r.Guid);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Handle Agent Specialisation Epochs
        var agentEntries = ChangeTracker.Entries<Agent>()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified)
            .Select(e => e.Entity)
            .ToList();

        foreach (var agent in agentEntries)
        {
            await agent.SetSpecialisationEpochAsync(this);
        }

        // Handle HistoricalEvent Epoch Assignments
        var historicalEventEntries = await this.HistoricalEvents.ToListAsync(cancellationToken);

        foreach (var historicalEvent in historicalEventEntries)
        {
            await historicalEvent.AssignEpochAsync(this, cancellationToken);
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    public async void Seed()
    {
        Randomizer.Seed = new Random(2145);

        var agents = new Faker<Agent>("de").CustomInstantiator(f => new Agent(
            firstname: f.Name.FirstName(),
            lastname: f.Name.LastName(),
            dateOfBirth: f.Date.Past().AddYears(-18),
            specialisationTime: f.Random.Int(-10000, 7025)
        )).Generate(5);
        this.Agents.AddRange(agents);
        await this.SaveChangesAsync();

        var licensedAgents = new Faker<LicensedAgent>("de").CustomInstantiator(f => new LicensedAgent(
            firstname: f.Name.FirstName(),
            lastname: f.Name.LastName(),
            dateOfBirth: f.Date.Past().AddYears(-18),
            specialisationTime: f.Random.Int(-10000, 7025),
            licenseNumber: f.Random.Int(),
            licenseExpirationDate: f.Date.Future()
        )).Generate(5);
        this.LicensedAgents.AddRange(licensedAgents);
        await this.SaveChangesAsync();

        var managers = new Faker<Manager>("de").CustomInstantiator(f => new Manager(
            firstName: f.Name.FirstName(),
            lastName: f.Name.LastName(),
            email: f.Internet.Email(),
            phoneNumber: "+1234567890"
        )).Generate(5);
        this.Managers.AddRange(managers);
        await this.SaveChangesAsync();        

        var customers = new Faker<Customer>("de").CustomInstantiator(f => new Customer(
            firstname: f.Name.FirstName(),
            lastname: f.Name.LastName(),
            email: f.Internet.Email(),
            phoneNumber: "+1234567890",
            dateOfBirth: f.Date.Past().AddYears(-18)
        )).Generate(5);
        this.Customers.AddRange(customers);
        await this.SaveChangesAsync();

        var trips = new Faker<Trip>("de").CustomInstantiator(f => new Trip(
            dateInRealLife: f.Date.Future(),
            licensedAgent: this.LicensedAgents.First(),
            manager: this.Managers.First()
        )).Generate(5);
        this.Trips.AddRange(trips);
        await this.SaveChangesAsync();

        var criticalTrips = new Faker<CriticalTrip>("de").CustomInstantiator(f => new CriticalTrip(
            licensedAgent: this.LicensedAgents.First(),
            dateInRealLife: f.Date.Future(),
            licensedSupportAgent: this.LicensedAgents.First(),
            manager: this.Managers.First()
        )).Generate(5);
        this.CriticalTrips.AddRange(criticalTrips);
        await this.SaveChangesAsync();
        
        foreach (var customer in Customers)
        {
            customer.AssignToTrip(Trips.First());
        }
        await this.SaveChangesAsync();

        var paradoxes = new Faker<Paradox>("de").CustomInstantiator(f => new Paradox(
            trip: this.Trips.First()
        )).Generate(3);
        this.Paradoxes.AddRange(paradoxes);
        await this.SaveChangesAsync();

        var report = new Faker<Report>("de").CustomInstantiator(f => new Report(
            header: f.Random.String2(10),
            agent: this.Agents.First(),
            trip: this.Trips.First()
        )).Generate(2);
        this.Reports.AddRange(report);
        await this.SaveChangesAsync();

        var review = new Faker<Review>("de").CustomInstantiator(f => new Review(
            header: f.Random.String2(10),
            stars: f.Random.Int(1, 5),
            customer: this.Customers.First(),
            trip: this.Trips.First()
        )).Generate(2);
        this.Reviews.AddRange(review);
        await this.SaveChangesAsync();
    }
}