namespace GarbageCollector
{
    internal class Program
    {
        static void Main(string[] args)
        {
            // Allocate some memory
            var obj1 = new object();
            var obj2 = new object();

            // Set obj1 and obj2 to null to make
            // them eligible for garbage collection
            obj1 = null;
            obj2 = null;

            // Trigger a garbage collection cycle
            System.GC.Collect();

            // The memory used by obj1 and obj2
            // should now be freed
        }
    }
}